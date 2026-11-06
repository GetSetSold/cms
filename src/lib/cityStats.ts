import { cache } from "react";
import { createMlsClient, normalizeCity, rawCitiesFor } from "./mls";

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
// Module-level 1h cache + Workers Cache API (mirrors listNeighbourhoods): a
// module Map alone re-queries on every cold Workers isolate.
const cityStatsCache = new Map<string, { data: CityStats; expires: number }>();
const CITY_STATS_TTL = 3600000;
const cityStatsCacheKey = (city: string) =>
  `https://internal/city-stats-v1?city=${encodeURIComponent(city.toLowerCase())}`;

export const getCityStats = cache(async (city: string): Promise<CityStats> => {
  const key = city.toLowerCase();
  const hit = cityStatsCache.get(key);
  if (hit && Date.now() < hit.expires) return hit.data;
  // Edge cache first (persists across Workers isolates).
  try {
    const cache = await caches.open("gss-static");
    const edgeHit = await cache.match(cityStatsCacheKey(city));
    if (edgeHit) {
      const data = (await edgeHit.json()) as CityStats;
      cityStatsCache.set(key, { data, expires: Date.now() + CITY_STATS_TTL });
      return data;
    }
  } catch { /* cache unavailable — fall through to the table/RPCs */ }
  // Phase 2: pre-computed table first — one indexed row instead of two
  // aggregations. Falls through to the RPCs if the table has no row yet
  // (writer not run) or the read fails.
  try {
    const mls = createMlsClient();
    const { data: row, error: rowErr } = await mls.from("city_stats")
      .select("active_count,sale_count,lease_count,median_sale,median_lease,type_breakdown")
      .eq("city", city).maybeSingle();
    if (!rowErr && row) {
      const result: CityStats = {
        city,
        activeCount: Number((row as any).active_count ?? 0),
        saleCount: Number((row as any).sale_count ?? 0),
        leaseCount: Number((row as any).lease_count ?? 0),
        medianSalePrice: (row as any).median_sale != null ? Math.round(Number((row as any).median_sale)) : null,
        medianLeasePrice: (row as any).median_lease != null ? Math.round(Number((row as any).median_lease)) : null,
        typeBreakdown: (((row as any).type_breakdown as any[]) ?? []).map((r) => ({
          label: r.label as string,
          count: Number(r.count),
        })),
      };
      cityStatsCache.set(key, { data: result, expires: Date.now() + CITY_STATS_TTL });
      try {
        const cache = await caches.open("gss-static");
        await cache.put(
          cityStatsCacheKey(city),
          new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${CITY_STATS_TTL / 1000}` } })
        );
      } catch { /* best-effort */ }
      return result;
    }
  } catch { /* fall through to the RPCs */ }

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
  try {
    const cache = await caches.open("gss-static");
    await cache.put(
      cityStatsCacheKey(city),
      new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${CITY_STATS_TTL / 1000}` } })
    );
  } catch { /* best-effort */ }
  return result;
});

export function formatPrice(n: number | null): string {
  if (n == null) return "—";
  return "$" + Math.round(n).toLocaleString("en-CA");
}

/** Home-type counts for a set of raw City variants, read from the pre-computed
 *  `city_stats` table (one indexed row per city) instead of downloading up to
 *  10,000 StructureTypeText values from the grid. The counts are only a hint
 *  in the filter dropdown (the UI falls back to basic types when empty), so a
 *  missing/stale city_stats row degrades to {} — never to a full-table scan.
 *  Area selections (e.g. "Hamilton (Ancaster)") normalize to their parent city,
 *  so the counts are city-wide for those; city hub pages already use the same
 *  whole-city breakdown. */
export async function getTypeCountsForVariants(
  variants: string[]
): Promise<Record<string, number>> {
  const names = [...new Set(variants.map((v) => normalizeCity(v)))].filter(Boolean);
  if (names.length === 0) return {};
  try {
    const mls = createMlsClient();
    const { data, error } = await mls
      .from("city_stats")
      .select("city,type_breakdown")
      .in("city", names);
    if (error || !data) return {};
    const counts: Record<string, number> = {};
    for (const row of data as { city: string; type_breakdown: { label: string; count: number }[] | null }[]) {
      for (const t of row.type_breakdown ?? []) {
        counts[t.label] = (counts[t.label] ?? 0) + Number(t.count ?? 0);
      }
    }
    return counts;
  } catch {
    return {};
  }
}
