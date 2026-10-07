import { NextRequest, NextResponse } from "next/server";
import { createMlsClient, listingSlug } from "@/lib/mls";
import { getSettings } from "@/lib/cms";
import { getHpiMarket, hpiMarketForCity, HPI_MARKET_COVERAGE } from "@/lib/hpi";

/**
 * POST /api/evaluate
 * Combines (1) similar ACTIVE listings near the address with (2) HPI market
 * direction to produce a preliminary estimate range. No sold data required.
 * Free-plan safe: one narrow MLS query per evaluation.
 */

const COLS =
  "ListingKey,ListPrice,UnparsedAddress,City,Latitude,Longitude,BedroomsTotal," +
  "BathroomsTotalInteger,AboveGradeFinishedArea,StructureTypeText,OriginalEntryTimestamp,TotalActualRent,Media";

const TYPE_KEYWORDS: Record<string, string[]> = {
  Detached: ["single family", "detached"],
  "Semi-Detached": ["semi"],
  Townhouse: ["townhouse", "row"],
  "Condo Apartment": ["condo", "apartment"],
  "Condo Townhouse": ["condo", "townhouse"],
};

const HPI_TYPE_KEY: Record<string, string> = {
  Detached: "singleFamily",
  "Semi-Detached": "singleFamily",
  Townhouse: "townhouse",
  "Condo Apartment": "apartment",
  "Condo Townhouse": "townhouse",
};

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const round1k = (n: number) => Math.round(n / 1000) * 1000;
const citySlug = (c: string) =>
  c.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const lat = Number(body.lat), lng = Number(body.lng);
  if (!isFinite(lat) || !isFinite(lng)) {
    return NextResponse.json({ error: "A valid address is required." }, { status: 422 });
  }

  const settings = await getSettings();
  const cfg = settings.home_evaluation ?? {};
  const radiusKm = Math.min(50, Math.max(1, Number(cfg.search_radius_km ?? 10)));
  const maxListings = Math.min(20, Math.max(3, Number(cfg.max_listings ?? 8)));
  const rangePct = Math.min(15, Math.max(1, Number(cfg.range_pct ?? 5)));

  const propertyType: string = String(body.propertyType ?? "Detached");
  const beds = Number(body.beds) || null;
  const sqft = Number(String(body.sqft).replace(/[^0-9]/g, "")) || null;

  // --- 1. Similar active listings near the address (bbox, narrow select) ---
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  const mls = createMlsClient();
  const { data, error } = await mls
    .from("grid")
    .select(COLS)
    .gte("Latitude", lat - latDelta)
    .lte("Latitude", lat + latDelta)
    .gte("Longitude", lng - lngDelta)
    .lte("Longitude", lng + lngDelta)
    .limit(200);
  if (error) {
    return NextResponse.json({ error: "Could not load nearby listings." }, { status: 502 });
  }

  const keywords = TYPE_KEYWORDS[propertyType] ?? [];
  const scored = (data ?? [])
    .filter((r: any) => typeof r.ListPrice === "number" && r.ListPrice > 0)
    .filter((r: any) => typeof r.Latitude === "number" && typeof r.Longitude === "number")
    .map((r: any) => {
      const st = String(r.StructureTypeText ?? "").toLowerCase();
      const typeHit = keywords.some((k) => st.includes(k)) ? 0 : 1;
      const bedDiff = beds != null && typeof r.BedroomsTotal === "number" ? Math.abs(r.BedroomsTotal - beds) : 2;
      const sqDiff =
        sqft != null && typeof r.AboveGradeFinishedArea === "number" && r.AboveGradeFinishedArea > 0
          ? Math.abs(r.AboveGradeFinishedArea - sqft) / sqft
          : 0.5;
      return { r, score: typeHit * 4 + Math.min(bedDiff, 4) + Math.min(sqDiff * 4, 4) };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, maxListings);

  const listings = scored.map(({ r }) => {
    const dom = r.OriginalEntryTimestamp
      ? Math.max(0, Math.round((Date.now() - new Date(r.OriginalEntryTimestamp).getTime()) / 86400000))
      : null;
    return {
      address: r.UnparsedAddress ?? r.City ?? "Nearby listing",
      price: r.ListPrice,
      beds: r.BedroomsTotal ?? null,
      baths: r.BathroomsTotalInteger ?? null,
      sqft: r.AboveGradeFinishedArea ?? null,
      daysOnMarket: dom,
      distanceKm: Math.round(haversineKm(lat, lng, r.Latitude, r.Longitude) * 10) / 10,
      key: r.ListingKey ?? null,
      image: typeof r.Media === "string" && r.Media ? r.Media : null,
      url:
        r.ListingKey
          ? `/real-estate/${encodeURIComponent(r.ListingKey)}/${listingSlug({ UnparsedAddress: r.UnparsedAddress, City: r.City })}`
          : null,
    };
  });

  // --- 2. HPI market direction for the city ---
  let hpi: {
    label: string; covers: string | null; change12m: number | null; momChange: number | null;
    benchmark: number | null; lastUpdated: string; propertyType: string;
  } | null = null;
  const slug = citySlug(String(body.city ?? ""));
  const marketSlug = slug ? hpiMarketForCity(slug) : null;
  if (marketSlug) {
    const market = await getHpiMarket(marketSlug);
    if (market) {
      const typeKey = HPI_TYPE_KEY[propertyType];
      const pt = typeKey ? (market.latest.propertyTypes as any)?.[typeKey] : null;
      const hist = market.history12m;
      const composite12m =
        hist?.length >= 2 && hist[0].compositeBenchmark > 0
          ? Math.round(((hist[hist.length - 1].compositeBenchmark - hist[0].compositeBenchmark) / hist[0].compositeBenchmark) * 1000) / 10
          : null;
      hpi = {
        label: market.name,
        covers: HPI_MARKET_COVERAGE[marketSlug] ?? null,
        change12m: typeof pt?.yoyChange === "number" ? Math.round(pt.yoyChange * 10) / 10 : composite12m,
        momChange: typeof pt?.momChange === "number" ? Math.round(pt.momChange * 10) / 10 : null,
        benchmark: pt?.benchmark ?? market.latest.compositeBenchmark ?? null,
        lastUpdated: market.lastUpdated,
        propertyType,
      };
    }
  }

  // --- 3. Combine into a preliminary range ---
  let estimate: { low: number; high: number; mid: number; median: number; count: number } | null = null;
  if (listings.length >= 3) {
    const prices = listings.map((l) => l.price).sort((a, b) => a - b);
    const median = prices[Math.floor(prices.length / 2)];
    estimate = {
      low: round1k(median * (1 - rangePct / 100)),
      high: round1k(median * (1 + rangePct / 100)),
      mid: round1k(median),
      median,
      count: listings.length,
    };
  }

  return NextResponse.json({ ok: true, estimate, listings, hpi, radiusKm });
}
