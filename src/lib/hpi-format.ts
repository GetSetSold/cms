/* Client-safe: types + formatting helpers (no server imports). */

export interface HpiPropertyType {
  hpi: number;
  benchmark: number;
  momChange: number;
  yoyChange: number;
}

export interface HpiLatest {
  compositeBenchmark: number;
  compositeHPI: number;
  momChange: number;
  yoyChange: number;
  marketCondition: "buyer" | "balanced" | "seller";
  propertyTypes: {
    singleFamily: HpiPropertyType;
    oneStorey: HpiPropertyType;
    twoStorey: HpiPropertyType;
    apartment: HpiPropertyType;
    townhouse: HpiPropertyType;
  };
}

export interface HpiMonth {
  month: string;
  compositeBenchmark: number;
  compositeHPI: number;
  singleFamilyBenchmark?: number;
  oneStoreyBenchmark?: number;
  twoStoreyBenchmark?: number;
  townhouseBenchmark?: number;
  apartmentBenchmark?: number;
}

export interface HpiMarket {
  slug: string;
  name: string;
  lastUpdated: string;
  latest: HpiLatest;
  history12m: HpiMonth[];
  fullHistory: { month: string; compositeBenchmark: number; compositeHPI: number }[];
}

export function fmtMoney(v: number): string {
  return "$" + Math.round(v).toLocaleString("en-CA");
}
export function fmtMoneyShort(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${Math.round(v)}`;
}
export function fmtPct(v: number): string {
  const r = Math.round(v * 10) / 10;
  return `${r > 0 ? "+" : ""}${r.toFixed(1)}%`;
}
export function pctTone(v: number): "neg" | "pos" | "flat" {
  return v < -0.05 ? "neg" : v > 0.05 ? "pos" : "flat";
}
export function monthShort(m: string): string {
  const [y, mo] = m.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[Number(mo) - 1]} \u2019${y.slice(2)}`;
}
