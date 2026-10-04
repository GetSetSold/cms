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

/** All neighbourhoods with >= HOOD_MIN_LISTINGS. */
export async function listNeighbourhoods(): Promise<Neighbourhood[]> {
  if (hoodsCache && Date.now() < hoodsCache.expires) return hoodsCache.data;
  const data = await scanNeighbourhoods();
  hoodsCache = { data, expires: Date.now() + 3600_000 };
  return data;
}



/** Neighbourhoods for one normalized city, sorted by listing count. */
export async function getHoodsForCity(city: string): Promise<Neighbourhood[]> {
  const all = await listNeighbourhoods();
  return all.filter((h) => h.city === city).sort((a, b) => b.count - a.count);
}

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
export const getHoodStats = cache(async (city: string, hood: string): Promise<CityStats> => {
  const mls = createMlsClient();
  const variants = await rawCitiesFor(city);
  const unknownVariants = await unknownCityVariants();
  const cities = [...new Set([...variants, ...unknownVariants])];

  const prices: number[] = [];
  const rents: number[] = [];
  const typeCounts = new Map<string, number>();
  let total = 0;

  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await mls
      .from("property")
      .select("ListPrice,TotalActualRent,StructureType")
      .in("City", cities)
      .or(`CityRegion.eq.${hood},SubdivisionName.eq.${hood}`)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`getHoodStats: ${error.message}`);
    if (!data || !data.length) break;
    for (const r of data as {
      ListPrice: number | null;
      TotalActualRent: number | null;
      StructureType: string[] | string | null;
    }[]) {
      total++;
      if (r.ListPrice != null) prices.push(Number(r.ListPrice));
      if (r.TotalActualRent != null) rents.push(Number(r.TotalActualRent));
      const t = structureTypeText(r.StructureType) || "Other";
      typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

  const median = (vals: number[]): number | null => {
    if (!vals.length) return null;
    const s = [...vals].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
  };

  return {
    city: hood, // components interpolate this as the place name
    activeCount: total,
    saleCount: prices.length,
    leaseCount: rents.length,
    medianSalePrice: median(prices),
    medianLeasePrice: median(rents),
    typeBreakdown: [...typeCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
  };
});

/** Paginated listings for a neighbourhood page (property table, newest first).
 *  Mapped to GridListing so ListingCard can be reused. */
export async function getHoodListings(
  city: string,
  hood: string,
  page: number,
  perPage: number
): Promise<{ listings: GridListing[]; total: number }> {
  const mls = createMlsClient();
  const variants = await rawCitiesFor(city);
  const unknownVariants = await unknownCityVariants();
  const cities = [...new Set([...variants, ...unknownVariants])];
  const from = (page - 1) * perPage;

  const { data, error, count } = await mls
    .from("property")
    .select(
      "ListingKey,ListingId,OfficeName,ListPrice,TotalActualRent,PhotosCount,Media,UnparsedAddress,City,Province,PostalCode,Latitude,Longitude,ParkingTotal,BathroomsTotalInteger,BedroomsTotal,AboveGradeFinishedArea,StructureType,OriginalEntryTimestamp",
      { count: "exact" }
    )
    .in("City", cities)
    .or(`CityRegion.eq.${hood},SubdivisionName.eq.${hood}`)
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
