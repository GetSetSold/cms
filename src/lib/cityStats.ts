import { cache } from "react";
import { createMlsClient } from "./mls";

export interface CityStats {
  city: string;
  activeCount: number;
  saleCount: number;
  leaseCount: number;
  medianSalePrice: number | null;
  medianLeasePrice: number | null;
  typeBreakdown: { label: string; count: number }[];
}

/** Live market stats for a city hub, from pre-aggregated DB views.
 *  Cached per request. HPI trend data (index MoM/YoY, benchmark price)
 *  slots in here once the /ontario-housing-market/trends function is
 *  ported to the CMS. */
// Module-level 1h cache — without this, every page load re-runs the queries
// (bandwidth killer on free plan).
const cityStatsCache = new Map<string, { data: CityStats; expires: number }>();
const CITY_STATS_TTL = 3600000;

export const getCityStats = cache(async (city: string): Promise<CityStats> => {
  const key = city.toLowerCase();
  const hit = cityStatsCache.get(key);
  if (hit && Date.now() < hit.expires) return hit.data;

  const mls = createMlsClient();
  // Use pre-aggregated views (fast: 2 small queries instead of fetching 10k+ rows).
  // Views group by normalized city, matching the `city` param from resolveCitySlug.
  const [{ data: statsRows }, { data: typeRows }] = await Promise.all([
    mls.from("city_stats_agg").select("*").eq("city", city).maybeSingle(),
    mls.from("city_type_breakdown_agg").select("type_label, count").eq("city", city).order("count", { ascending: false }).limit(6),
  ]);

  const s = (statsRows ?? {}) as { active_count?: number; sale_count?: number; lease_count?: number; median_sale_price?: number | null; median_lease_price?: number | null };
  // Round medians to match the old client-side median() behaviour.
  const roundMedian = (v: number | null | undefined): number | null =>
    v == null ? null : Math.round(Number(v));

  const result: CityStats = {
    city,
    activeCount: Number(s.active_count ?? 0),
    saleCount: Number(s.sale_count ?? 0),
    leaseCount: Number(s.lease_count ?? 0),
    medianSalePrice: roundMedian(s.median_sale_price),
    medianLeasePrice: roundMedian(s.median_lease_price),
    typeBreakdown: ((typeRows ?? []) as { type_label: string; count: number }[]).map((r) => ({
      label: r.type_label || "Other",
      count: Number(r.count),
    })),
  };
  cityStatsCache.set(key, { data: result, expires: Date.now() + CITY_STATS_TTL });
  return result;
});

export function formatPrice(n: number | null): string {
  if (n == null) return "—";
  return "$" + Math.round(n).toLocaleString("en-CA");
}
