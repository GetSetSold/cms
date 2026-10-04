import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { HpiLatest, HpiMarket, HpiMonth } from "./hpi-format";

/* Data access (module-level 1h cache — free-plan friendly)             */
/* ------------------------------------------------------------------ */

interface HpiCacheEntry {
  data: HpiMarket[];
  expires: number;
}
const hpiCache: { all?: HpiCacheEntry } = {};
const HPI_TTL = 3600000;

function rowToMarket(row: Record<string, unknown>): HpiMarket {
  return {
    slug: row.slug as string,
    name: row.name as string,
    lastUpdated: (row.last_updated as string) ?? "",
    latest: row.latest as HpiLatest,
    history12m: (row.history_12m as HpiMonth[]) ?? [],
    fullHistory: (row.full_history as HpiMarket["fullHistory"]) ?? [],
  };
}

async function fetchAllMarkets(): Promise<HpiMarket[]> {
  const hit = hpiCache.all;
  if (hit && Date.now() < hit.expires) return hit.data;
  const supabase = await createClient();
  const { data, error } = await supabase.from("hpi_markets").select("*");
  if (error) throw new Error(`hpi: ${error.message}`);
  const markets = ((data ?? []) as Record<string, unknown>[]).map(rowToMarket);
  hpiCache.all = { data: markets, expires: Date.now() + HPI_TTL };
  return markets;
}

export const getHpiMarkets = cache(fetchAllMarkets);

export async function getHpiMarket(slug: string): Promise<HpiMarket | null> {
  const markets = await getHpiMarkets();
  return markets.find((m) => m.slug === slug) ?? null;
}

export function invalidateHpiCache() {
  delete hpiCache.all;
}

/* ------------------------------------------------------------------ */
/* City -> HPI market mapping                                          */
/* Neighbourhoods inherit their parent city's market.                  */
/* ------------------------------------------------------------------ */

const CITY_TO_HPI: Record<string, string> = {
  // Greater Toronto
  toronto: "greater-toronto", "etobicoke": "greater-toronto", "scarborough": "greater-toronto",
  "north-york": "greater-toronto", "york": "greater-toronto", "east-york": "greater-toronto",
  vaughan: "greater-toronto", markham: "greater-toronto", richmondhill: "greater-toronto",
  "richmond-hill": "greater-toronto", pickering: "greater-toronto", ajax: "greater-toronto",
  whitby: "greater-toronto", oshawa: "greater-toronto", newmarket: "greater-toronto",
  aurora: "greater-toronto",
  // Mississauga / Peel
  mississauga: "mississauga", brampton: "mississauga", caledon: "mississauga",
  // Oakville-Milton / Halton
  oakville: "oakville-milton", milton: "oakville-milton", "halton-hills": "oakville-milton",
  // Hamilton-Burlington (board coverage per legacy trends page)
  hamilton: "hamilton-burlington", burlington: "hamilton-burlington", ancaster: "hamilton-burlington",
  dundas: "hamilton-burlington", waterdown: "hamilton-burlington", flamborough: "hamilton-burlington",
  glanbrook: "hamilton-burlington", "stoney-creek": "hamilton-burlington", binbrook: "hamilton-burlington",
  "mount-hope": "hamilton-burlington",
  caledonia: "hamilton-burlington", haldimand: "hamilton-burlington", cayuga: "hamilton-burlington",
  dunnville: "hamilton-burlington", hagersville: "hamilton-burlington", jarvis: "hamilton-burlington",
  grimsby: "hamilton-burlington",
  // Golden Horseshoe / Waterloo region
  guelph: "guelph", barrie: "barrie", cambridge: "cambridge",
  kitchener: "kitchener-waterloo", waterloo: "kitchener-waterloo",
  brantford: "brantford", "paris": "brantford",
  // Ottawa valley
  ottawa: "ottawa", kanata: "ottawa", orleans: "ottawa", nepean: "ottawa",
  // Southwest
  windsor: "windsor-essex", essex: "windsor-essex", tecumseh: "windsor-essex", lasalle: "windsor-essex",
  woodstock: "woodstock-ingersoll-tillsonburg", ingersoll: "woodstock-ingersoll-tillsonburg",
  tillsonburg: "woodstock-ingersoll-tillsonburg",
  "st-thomas": "london-st-thomas", london: "london-st-thomas",
  // Niagara
  "niagara-falls": "niagara-region", "st-catharines": "niagara-region", welland: "niagara-region",
  "niagara-on-the-lake": "niagara-region", fortErie: "niagara-region", "fort-erie": "niagara-region",
  pelham: "niagara-region", lincoln: "niagara-region",
  // Central / Kawarthas
  peterborough: "peterborough", "kawartha-lakes": "kawartha-lakes", lindsay: "kawartha-lakes",
  // Simcoe / Muskoka
  orillia: "simcoe", collingwood: "simcoe", midland: "simcoe",
  // Grey-Bruce / Huron
  "owen-sound": "grey-bruce-owen-sound", southampton: "grey-bruce-owen-sound",
  goderich: "huron-perth", "stratford": "huron-perth",
  // East
  kingston: "kingston", belleville: "quinte", trenton: "quinte",
  brockville: "rideau-st-lawrence", cornwall: "rideau-st-lawrence",
  cobourg: "northumberland-hills", porthope: "northumberland-hills", "port-hope": "northumberland-hills",
  bancroft: "bancroft",
  // North
  sudbury: "sudbury", "north-bay": "north-bay", "sault-ste-marie": "sault-ste-marie",
  bracebridge: "lakelands", huntsville: "lakelands", gravenhurst: "lakelands",
};

/** HPI market slug for a city slug (e.g. "hamilton"), or null when unmapped. */
export function hpiMarketForCity(citySlug: string): string | null {
  return CITY_TO_HPI[citySlug.toLowerCase()] ?? null;
}

/* ------------------------------------------------------------------ */
/* Insights computed from full history                                 */
/* ------------------------------------------------------------------ */

export interface HpiInsights {
  peak: number;
  peakMonth: string;
  fromPeakPct: number;
  trough: number;
  troughMonth: string;
  aboveTroughPct: number;
  qoqPct: number;
  y3Pct: number | null;
  y5Pct: number | null;
  volatility: "Low" | "Medium" | "High";
  volatilityStd: number;
  condoHouseGap: number;
  bestPerformer: { label: string; yoy: number };
  worstPerformer: { label: string; yoy: number };
  momentumScore: number; // 0-10
  momentumLabel: string;
}

const PT_LABELS: [keyof HpiLatest["propertyTypes"], string][] = [
  ["singleFamily", "Single Family"],
  ["oneStorey", "One Storey"],
  ["twoStorey", "Two Storey"],
  ["townhouse", "Townhouse"],
  ["apartment", "Apartment / Condo"],
];

function monthLabel(m: string): string {
  const [y, mo] = m.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[Number(mo) - 1]} ${y}`;
}

function pctChange(now: number, then: number): number {
  return then ? ((now - then) / then) * 100 : 0;
}

export function computeInsights(market: HpiMarket): HpiInsights {
  const hist = market.fullHistory;
  const latest = market.latest.compositeBenchmark;

  let peak = 0, peakMonth = "", trough = Infinity, troughMonth = "";
  for (const h of hist) {
    if (h.compositeBenchmark > peak) { peak = h.compositeBenchmark; peakMonth = h.month; }
    if (h.compositeBenchmark < trough) { trough = h.compositeBenchmark; troughMonth = h.month; }
  }
  if (!isFinite(trough)) trough = 0;

  const at = (monthsAgo: number): number | null => {
    const i = hist.length - 1 - monthsAgo;
    return i >= 0 ? hist[i].compositeBenchmark : null;
  };
  const m3 = at(3), m36 = at(36), m60 = at(60);

  // Volatility: std dev of MoM % changes over trailing 12 months
  const momChanges: number[] = [];
  for (let i = Math.max(1, hist.length - 12); i < hist.length; i++) {
    momChanges.push(pctChange(hist[i].compositeBenchmark, hist[i - 1].compositeBenchmark));
  }
  const mean = momChanges.reduce((a, b) => a + b, 0) / Math.max(1, momChanges.length);
  const variance = momChanges.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, momChanges.length);
  const std = Math.sqrt(variance);
  const volatility = std < 1.5 ? "Low" : std < 3 ? "Medium" : "High";

  const pts = market.latest.propertyTypes;
  const ranked = PT_LABELS.map(([k, label]) => ({ label, yoy: pts[k].yoyChange })).sort((a, b) => b.yoy - a.yoy);
  const condoHouseGap = pts.singleFamily.benchmark - pts.apartment.benchmark;

  // Momentum: trend direction (40%) + low volatility (30%) + seller-leaning condition (30%)
  const yoy = market.latest.yoyChange;
  const trendScore = Math.max(0, Math.min(10, 5 + yoy));
  const volScore = volatility === "Low" ? 8 : volatility === "Medium" ? 5 : 2;
  const condScore = market.latest.marketCondition === "seller" ? 9 : market.latest.marketCondition === "balanced" ? 6 : 3;
  const momentumScore = Math.round((trendScore * 0.4 + volScore * 0.3 + condScore * 0.3) * 10) / 10;
  const momentumLabel = momentumScore >= 7 ? "Strong" : momentumScore >= 4 ? "Moderate" : "Weak";

  return {
    peak, peakMonth: peakMonth ? monthLabel(peakMonth) : "",
    fromPeakPct: pctChange(latest, peak),
    trough, troughMonth: troughMonth ? monthLabel(troughMonth) : "",
    aboveTroughPct: pctChange(latest, trough),
    qoqPct: m3 != null ? pctChange(latest, m3) : 0,
    y3Pct: m36 != null ? pctChange(latest, m36) : null,
    y5Pct: m60 != null ? pctChange(latest, m60) : null,
    volatility, volatilityStd: Math.round(std * 100) / 100,
    condoHouseGap,
    bestPerformer: ranked[0], worstPerformer: ranked[ranked.length - 1],
    momentumScore, momentumLabel,
  };
}

/** Ontario average benchmark across all markets (for affordability insight). */
export async function ontarioAverageBenchmark(): Promise<number | null> {
  const markets = await getHpiMarkets();
  if (!markets.length) return null;
  const sum = markets.reduce((a, m) => a + (m.latest.compositeBenchmark || 0), 0);
  return Math.round(sum / markets.length);
}

/* ------------------------------------------------------------------ */

export { fmtMoney, fmtMoneyShort, fmtPct, pctTone, monthShort } from "./hpi-format";
export type { HpiLatest, HpiMarket, HpiMonth, HpiPropertyType } from "./hpi-format";
