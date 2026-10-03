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
export const getCityStats = cache(async (city: string): Promise<CityStats> => {
  const mls = createMlsClient();
  const variants = await rawCitiesFor(city);
  const rows: GridRow[] = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await mls
      .from("grid")
      .select("ListPrice, TotalActualRent, StructureTypeText")
      .in("City", variants)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`cityStats: ${error.message}`);
    if (!data || !data.length) break;
    rows.push(...(data as GridRow[]));
    if (data.length < PAGE) break;
    from += PAGE;
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

  return {
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
});

export function formatPrice(n: number | null): string {
  if (n == null) return "—";
  return "$" + Math.round(n).toLocaleString("en-CA");
}
