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

/** Live market stats for a city hub, computed via SQL aggregation RPC.
 *  Cached per request. HPI trend data (index MoM/YoY, benchmark price)
 *  slots in here once the /ontario-housing-market/trends function is
 *  ported to the CMS. */
// Module-level 1h cache — the RPC returns single-row results, but we still
// cache to avoid hammering the DB on popular city pages.
const cityStatsCache = new Map<string, { data: CityStats; expires: number }>();
const CITY_STATS_TTL = 3600000;

export const getCityStats = cache(async (city: string): Promise<CityStats> => {
  const key = city.toLowerCase();
  const hit = cityStatsCache.get(key);
  if (hit && Date.now() < hit.expires) return hit.data;

  const mls = createMlsClient();
  const variants = await rawCitiesFor(city);

  // Single aggregation query via RPC — no more downloading thousands of rows.
  // Requires migration 20261013000001_city_hub_performance.sql in the MLS project.
  const [statsRes, typeRes] = await Promise.all([
    mls.rpc('get_city_stats', { cities: variants }),
    mls.rpc('get_city_type_breakdown', { cities: variants }),
  ]);

  if (statsRes.error) throw new Error(`cityStats: ${statsRes.error.message}`);
  if (typeRes.error) throw new Error(`cityStats types: ${typeRes.error.message}`);

  const s = (statsRes.data as any[])?.[0] ?? {};
  const typeBreakdown = ((typeRes.data as any[]) ?? []).map((r) => ({
    label: r.label as string,
    count: Number(r.count),
  }));

  const result: CityStats = {
    city,
    activeCount: Number(s.active_count ?? 0),
    saleCount: Number(s.sale_count ?? 0),
    leaseCount: Number(s.lease_count ?? 0),
    medianSalePrice: s.median_sale != null ? Math.round(Number(s.median_sale)) : null,
    medianLeasePrice: s.median_lease != null ? Math.round(Number(s.median_lease)) : null,
    typeBreakdown,
  };
  cityStatsCache.set(key, { data: result, expires: Date.now() + CITY_STATS_TTL });
  return result;
});

export function formatPrice(n: number | null): string {
  if (n == null) return "—";
  return "$" + Math.round(n).toLocaleString("en-CA");
}
