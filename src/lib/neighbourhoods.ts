import { cache } from "react";
import {
  createMlsClient,
  normalizeCity,
  citySlug,
  rawCitiesFor,
  listCities,
  type PropertyListing,
  type GridListing,
} from "./mls";
import { type CityStats } from "./cityStats";

export interface Neighbourhood {
  /** Normalized parent city, e.g. "Toronto". */
  city: string;
  /** Display name, e.g. "Waterfront Communities C1". */
  hood: string;
  hoodSlug: string;
  count: number;
}

/** Aggressive slugify for neighbourhood names (strips district codes'
 *  punctuation): "219 - Forestview" -> "219-forestview". */
export function hoodSlug(hood: string): string {
  return hood
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}


/** property.StructureType is string[] | string | null; normalize to display text. */
function structureTypeText(v: string[] | string | null | undefined): string | null {
  if (!v) return null;
  if (Array.isArray(v)) return v.filter(Boolean).join(", ") || null;
  const t = v.trim();
  if (t.startsWith("[")) {
    try {
      const arr = JSON.parse(t);
      if (Array.isArray(arr)) return arr.filter(Boolean).join(", ") || null;
    } catch { /* not JSON, use raw */ }
  }
  return t || null;
}

/** Minimum active listings for a neighbourhood to get its own page. */
export const HOOD_MIN_LISTINGS = 5;

/** Separator for "city|hood" map keys — never appears in names. */
const SEP = "|||";

interface HoodRow {
  City: string | null;
  CityRegion: string | null;
  SubdivisionName: string | null;
}

function coalesceHood(r: HoodRow): string {
  return ((r.CityRegion || r.SubdivisionName) || "").trim();
}

/** Raw City values that normalize to "Unknown"/empty — folded into each
 *  neighbourhood's primary city rather than getting orphan pages. */
async function unknownCityVariants(): Promise<string[]> {
  const raw = await listCities();
  return raw.filter((c) => {
    const n = normalizeCity(c);
    return !n || n.toLowerCase() === "unknown";
  });
}

async function scanNeighbourhoods(): Promise<Neighbourhood[]> {
  const mls = createMlsClient();
  const pairCounts = new Map<string, number>();
  const hoodCityCounts = new Map<string, Map<string, number>>();
  const unknownCounts = new Map<string, number>();
  const displayNames = new Map<string, string>();

  // Sequential pages: reliable on Workers (parallel bursts trip subrequest limits).
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await mls
      .from("property")
      .select("City,CityRegion,SubdivisionName")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`scanNeighbourhoods: ${error.message}`);
    if (!data || !data.length) break;
    for (const r of data as HoodRow[]) {
      const hood = coalesceHood(r);
      if (!hood) continue;
      const city = normalizeCity(r.City || "");
      if (!city || city.toLowerCase() === "unknown") {
        unknownCounts.set(hood, (unknownCounts.get(hood) ?? 0) + 1);
        continue;
      }
      const key = city + SEP + hood;
      pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      if (!displayNames.has(key)) displayNames.set(key, hood);
      let cm = hoodCityCounts.get(hood);
      if (!cm) hoodCityCounts.set(hood, (cm = new Map()));
      cm.set(city, (cm.get(city) ?? 0) + 1);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

  // Fold "Unknown"-city listings into each hood's primary city.
  for (const [hood, count] of unknownCounts) {
    const cm = hoodCityCounts.get(hood);
    if (!cm || cm.size === 0) continue;
    const topCity = [...cm.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const key = topCity + SEP + hood;
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + count);
    if (!displayNames.has(key)) displayNames.set(key, hood);
  }

  const out: Neighbourhood[] = [];
  for (const [key, count] of pairCounts) {
    if (count < HOOD_MIN_LISTINGS) continue;
    const sepIdx = key.indexOf(SEP);
    const city = key.slice(0, sepIdx);
    const display = displayNames.get(key) ?? key.slice(sepIdx + SEP.length);
    out.push({ city, hood: display, hoodSlug: hoodSlug(display), count });
  }
  out.sort((a, b) => b.count - a.count);
  return out;
}

/** Module-level cache (1h). unstable_cache does not persist on Workers. */
let hoodsCache: { data: Neighbourhood[]; expires: number } | null = null;

const HOODS_CACHE_KEY = "https://internal/hoods-v1";
const HOODS_CACHE_TTL = 3600; // 1 hour

/** All neighbourhoods with >= HOOD_MIN_LISTINGS. Uses Cloudflare Cache API
 *  so the 57k-row scan runs once per hour, not per request. */
export async function listNeighbourhoods(): Promise<Neighbourhood[]> {
  if (hoodsCache && Date.now() < hoodsCache.expires) return hoodsCache.data;
  // Try edge cache first (persists across Workers isolates).
  try {
    const cache = await caches.open("gss-static");
    const hit = await cache.match(HOODS_CACHE_KEY);
    if (hit) {
      const data = (await hit.json()) as Neighbourhood[];
      hoodsCache = { data, expires: Date.now() + 3600_000 };
      return data;
    }
  } catch { /* cache unavailable — fall through to scan */ }
  const data = await scanNeighbourhoods();
  hoodsCache = { data, expires: Date.now() + 3600_000 };
  try {
    const cache = await caches.open("gss-static");
    await cache.put(
      HOODS_CACHE_KEY,
      new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${HOODS_CACHE_TTL}` } })
    );
  } catch { /* best-effort */ }
  return data;
}

/** Cache-only read of the neighbourhood list — never triggers the 57k-row
 *  scan. Returns null on a cold cache. The admin sitemap dashboard uses this
 *  so it renders instantly instead of blocking on a scan it didn't ask for. */
export async function peekNeighbourhoods(): Promise<Neighbourhood[] | null> {
  if (hoodsCache && Date.now() < hoodsCache.expires) return hoodsCache.data;
  try {
    const cache = await caches.open("gss-static");
    const hit = await cache.match(HOODS_CACHE_KEY);
    if (hit) {
      const data = (await hit.json()) as Neighbourhood[];
      hoodsCache = { data, expires: Date.now() + 3600_000 };
      return data;
    }
  } catch { /* cache unavailable */ }
  return null;
}

/** Neighbourhoods for one normalized city, sorted by listing count.
 *  Scoped to the city's listings only via SQL aggregation RPC — never scans
 *  the full table. Requires migration 20261013000001_city_hub_performance.sql.
 *  Cached 1h in the Workers Cache API (module Map alone re-queries on every
 *  cold isolate) — mirrors listNeighbourhoods. */
const hoodsForCityCache = new Map<string, { data: Neighbourhood[]; expires: number }>();
const hoodsForCityKey = (city: string) =>
  `https://internal/hoods-for-city-v1?city=${encodeURIComponent(city.toLowerCase())}`;

export const getHoodsForCity = cache(async (city: string): Promise<Neighbourhood[]> => {
  const key = city.toLowerCase();
  const hit = hoodsForCityCache.get(key);
  if (hit && Date.now() < hit.expires) return hit.data;
  try {
    const cache = await caches.open("gss-static");
    const edgeHit = await cache.match(hoodsForCityKey(city));
    if (edgeHit) {
      const data = (await edgeHit.json()) as Neighbourhood[];
      hoodsForCityCache.set(key, { data, expires: Date.now() + 3600_000 });
      return data;
    }
  } catch { /* cache unavailable — fall through to the RPC */ }
  const mls = createMlsClient();
  const variants = await rawCitiesFor(city);
  const { data, error } = await mls.rpc('get_hoods_for_city', { cities: variants });
  if (error) throw new Error(`getHoodsForCity: ${error.message}`);
  const out = ((data as any[]) ?? []).map((r) => {
    const hood = r.hood as string;
    return {
      city,
      hood,
      hoodSlug: hoodSlug(hood),
      count: Number(r.count),
    };
  });
  hoodsForCityCache.set(key, { data: out, expires: Date.now() + 3600_000 });
  try {
    const cache = await caches.open("gss-static");
    await cache.put(
      hoodsForCityKey(city),
      new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" } })
    );
  } catch { /* best-effort */ }
  return out;
});

/** Resolve (citySlug, hoodSlug) to a Neighbourhood, or null. */
export async function resolveHood(
  citySlugParam: string,
  hoodSlugParam: string
): Promise<Neighbourhood | null> {
  const all = await listNeighbourhoods();
  const c = citySlugParam.toLowerCase();
  const h = hoodSlugParam.toLowerCase();
  return all.find((n) => citySlug(n.city) === c && n.hoodSlug === h) ?? null;
}

/** Live stats for a neighbourhood page — same shape as city stats so the
 *  CityStatsSection / CityEditorial / CityFaq components can be reused
 *  with the neighbourhood name. */
// Module-level 1h cache + Workers Cache API (mirrors listNeighbourhoods):
// a module Map alone re-queries on every cold Workers isolate.
const hoodStatsCache = new Map<string, { data: CityStats; expires: number }>();
const HOOD_STATS_TTL = 3600000;
const hoodStatsKey = (city: string, hood: string) =>
  `https://internal/hood-stats-v1?city=${encodeURIComponent(city.toLowerCase())}&hood=${encodeURIComponent(hood.toLowerCase())}`;

export const getHoodStats = cache(async (city: string, hood: string): Promise<CityStats> => {
  const key = `${city.toLowerCase()}|${hood.toLowerCase()}`;
  const hit = hoodStatsCache.get(key);
  if (hit && Date.now() < hit.expires) return hit.data;
  // Edge cache first (persists across Workers isolates).
  try {
    const cache = await caches.open("gss-static");
    const edgeHit = await cache.match(hoodStatsKey(city, hood));
    if (edgeHit) {
      const data = (await edgeHit.json()) as CityStats;
      hoodStatsCache.set(key, { data, expires: Date.now() + HOOD_STATS_TTL });
      return data;
    }
  } catch { /* cache unavailable — fall through to the RPCs */ }

  const mls = createMlsClient();
  const variants = await rawCitiesFor(city);
  const unknownVariants = await unknownCityVariants();
  const cities = [...new Set([...variants, ...unknownVariants])];

  // Single aggregation queries via RPC — no more downloading all listings.
  // Requires migration 20261013000001_city_hub_performance.sql in the MLS project.
  const [statsRes, typeRes] = await Promise.all([
    mls.rpc('get_hood_stats', { cities, hood }),
    mls.rpc('get_hood_type_breakdown', { cities, hood }),
  ]);

  if (statsRes.error) throw new Error(`getHoodStats: ${statsRes.error.message}`);
  if (typeRes.error) throw new Error(`getHoodStats types: ${typeRes.error.message}`);

  const s = (statsRes.data as any[])?.[0] ?? {};
  const typeBreakdown = ((typeRes.data as any[]) ?? []).map((r) => ({
    label: r.label as string,
    count: Number(r.count),
  }));

  const result: CityStats = {
    city: hood, // components interpolate this as the place name
    activeCount: Number(s.active_count ?? 0),
    saleCount: Number(s.sale_count ?? 0),
    leaseCount: Number(s.lease_count ?? 0),
    medianSalePrice: s.median_sale != null ? Math.round(Number(s.median_sale)) : null,
    medianLeasePrice: s.median_lease != null ? Math.round(Number(s.median_lease)) : null,
    typeBreakdown,
  };
  hoodStatsCache.set(key, { data: result, expires: Date.now() + HOOD_STATS_TTL });
  try {
    const cache = await caches.open("gss-static");
    await cache.put(
      hoodStatsKey(city, hood),
      new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${HOOD_STATS_TTL / 1000}` } })
    );
  } catch { /* best-effort */ }
  return result;
});

/** Paginated listings for a neighbourhood page (property table, newest first).
 *  Mapped to GridListing so ListingCard can be reused. */
export interface HoodFilters {
  type?: string;
  minPrice?: string;
  maxPrice?: string;
  beds?: string;
  baths?: string;
  homeType?: string;
}

export async function getHoodListings(
  city: string,
  hood: string,
  page: number,
  perPage: number,
  filters?: HoodFilters
): Promise<{ listings: GridListing[]; total: number }> {
  const mls = createMlsClient();
  const variants = await rawCitiesFor(city);
  const unknownVariants = await unknownCityVariants();
  const cities = [...new Set([...variants, ...unknownVariants])];
  const from = (page - 1) * perPage;

  let q = mls
    .from("property")
    .select(
      "ListingKey,ListingId,OfficeName,ListPrice,TotalActualRent,PhotosCount,Media,UnparsedAddress,City,Province,PostalCode,Latitude,Longitude,ParkingTotal,BathroomsTotalInteger,BedroomsTotal,AboveGradeFinishedArea,StructureType,OriginalEntryTimestamp",
      { count: "exact" }
    )
    .in("City", cities)
    .or(`CityRegion.eq.${hood},SubdivisionName.eq.${hood}`);
  const f = filters ?? {};
  if (f.type === "sale") q = q.not("ListPrice", "is", null);
  else if (f.type === "rent") q = q.is("ListPrice", null).not("TotalActualRent", "is", null);
  if (f.beds) q = q.gte("BedroomsTotal", Number(f.beds));
  if (f.baths) q = q.gte("BathroomsTotalInteger", Number(f.baths));
  if (f.homeType) {
    const safe = f.homeType.replace(/[^a-zA-Z0-9 /-]/g, "").slice(0, 40);
    if (safe) q = q.ilike("StructureType", `%"${safe}"%`);
  }
  const priceCol = f.type === "rent" ? "TotalActualRent" : "ListPrice";
  if (f.minPrice) q = q.gte(priceCol, Number(f.minPrice));
  if (f.maxPrice) q = q.lte(priceCol, Number(f.maxPrice));
  const { data, error, count } = await q
    .order("OriginalEntryTimestamp", { ascending: false })
    .range(from, from + perPage - 1);
  if (error) throw new Error(`getHoodListings: ${error.message}`);
  const listings = ((data ?? []) as PropertyListing[]).map(
    (p) =>
      ({
        ...p,
        StructureTypeText: structureTypeText(p.StructureType as string[] | string | null),
        Media: Array.isArray(p.Media) ? p.Media[0]?.MediaURL ?? null : (p.Media as string | null),
      } as GridListing)
  );
  return { listings, total: count ?? 0 };
}

/** Property-type breakdown for a neighbourhood's filter dropdown. */
export async function getHoodTypeCounts(city: string, hood: string): Promise<Record<string, number>> {
  const mls = createMlsClient();
  const variants = await rawCitiesFor(city);
  const unknownVariants = await unknownCityVariants();
  const cities = [...new Set([...variants, ...unknownVariants])];
  const { data } = await mls
    .from("property")
    .select("StructureType")
    .in("City", cities)
    .or(`CityRegion.eq.${hood},SubdivisionName.eq.${hood}`)
    .limit(10000);
  const counts: Record<string, number> = {};
  for (const r of (data ?? []) as { StructureType: unknown }[]) {
    const raw = r.StructureType;
    let vals: string[] = [];
    if (Array.isArray(raw)) vals = raw as string[];
    else if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        vals = Array.isArray(parsed) ? parsed : [raw];
      } catch {
        vals = [raw];
      }
    }
    for (const v of vals) {
      const t = String(v).trim() || "Other";
      counts[t] = (counts[t] || 0) + 1;
    }
  }
  return counts;
}
