import { cache } from "react";
import { createMlsClient, rawCitiesFor } from "./mls";

export interface CityStats {
  city: string;
  activeCount: number;
  saleCount: number;
  leaseCount: number;
  medianSalePrice: number | null;
  medianLeasePrice: number | null;
  typeBreakdown: { label: string; count: number }[];
}

interface GridRow {
  ListPrice: number | null;
  TotalActualRent: number | null;
  StructureTypeText: string | null;
}

/** Median of a number array (null if empty). */
function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/** Live market stats for a city hub, computed from the active-listing grid.
 *  Cached per request. HPI trend data (index MoM/YoY, benchmark price)
 *  slots in here once the /ontario-housing-market/trends function is
 *  ported to the CMS. */
// Module-level 1h cache — the paginated scan fetches up to N rows per 1000.
// Without this, every page load re-runs the full scan (bandwidth killer on free plan).
const cityStatsCache = new Map<string, { data: CityStats; expires: number }>();
const CITY_STATS_TTL = 3600000;

export const getCityStats = cache(async (city: string): Promise<CityStats> => {
  const key = city.toLowerCase();
  const hit = cityStatsCache.get(key);
  if (hit && Date.now() < hit.expires) return hit.data;

  const mls = createMlsClient();
  const variants = await rawCitiesFor(city);
  // Get count first, then fetch all pages in PARALLEL (was sequential).
  const { count } = await mls.from("grid").select("ListingKey", { count: "exact", head: true }).in("City", variants);
  const PAGE = 1000;
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const results = await Promise.all(
    Array.from({ length: pages }, (_, i) =>
      mls.from("grid").select("ListPrice, TotalActualRent, StructureTypeText").in("City", variants).range(i * PAGE, i * PAGE + PAGE - 1)
    )
  );
  const rows: GridRow[] = [];
  for (const r of results) {
    if (r.error) throw new Error(`cityStats: ${r.error.message}`);
    if (r.data) rows.push(...(r.data as GridRow[]));
  }

  const salePrices: number[] = [];
  const leasePrices: number[] = [];
  const typeCounts = new Map<string, number>();
  for (const r of rows) {
    if (r.ListPrice != null) salePrices.push(Number(r.ListPrice));
    if (r.TotalActualRent != null) leasePrices.push(Number(r.TotalActualRent));
    const t = (r.StructureTypeText || "Other").trim() || "Other";
    typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
  }

  const result: CityStats = {
    city,
    activeCount: rows.length,
    saleCount: salePrices.length,
    leaseCount: leasePrices.length,
    medianSalePrice: median(salePrices),
    medianLeasePrice: median(leasePrices),
    typeBreakdown: [...typeCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
  };
  cityStatsCache.set(key, { data: result, expires: Date.now() + CITY_STATS_TTL });
  return result;
});

export function formatPrice(n: number | null): string {
  if (n == null) return "—";
  return "$" + Math.round(n).toLocaleString("en-CA");
}
