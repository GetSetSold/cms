import Link from "next/link";
import { getHpiMarket, HPI_MARKET_COVERAGE, computeInsights, fmtMoney, fmtPct, pctTone } from "@/lib/hpi";
import type { BlockProps } from "./index";
import { MarketStatsChart } from "./MarketStatsChart";

/** Rule-based narrative from HPI numbers — factual, no invented data. */
function draftNarrative(market: NonNullable<Awaited<ReturnType<typeof getHpiMarket>>>): { means: string; watch: string } {
  const { latest, history12m, name, lastUpdated } = market;
  const ins = computeInsights(market);
  const mom = latest.momChange;
  const yoy = latest.yoyChange;
  const dir = mom < -0.05 ? "slipped" : mom > 0.05 ? "rose" : "held steady";
  const d = new Date(lastUpdated + (lastUpdated.includes("T") ? "" : "T00:00:00"));
  const monthName = isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-CA", { month: "long" });
  // Consecutive monthly moves in the same direction
  let streak = 0;
  for (let i = history12m.length - 1; i > 0; i--) {
    const dd = history12m[i].compositeBenchmark - history12m[i - 1].compositeBenchmark;
    if ((mom < -0.05 && dd < 0) || (mom > 0.05 && dd > 0)) streak++;
    else break;
  }
  const streakTxt = streak >= 2
    ? ` — the ${streak === 2 ? "second" : streak === 3 ? "third" : `${streak}th`} straight monthly ${mom < 0 ? "decline" : "gain"}`
    : "";
  const cond = latest.marketCondition === "buyer" ? "a buyer's market" : latest.marketCondition === "seller" ? "a seller's market" : "balanced territory";
  const means = `Benchmark prices in ${name} ${dir} ${fmtPct(Math.abs(mom)).replace("+", "")}${monthName ? ` in ${monthName}` : ""} to ${fmtMoney(latest.compositeBenchmark)}${streakTxt}. Year over year, prices are ${yoy < 0 ? "down" : "up"} ${fmtPct(Math.abs(yoy)).replace("+", "")}. With ${ins.fromPeakPct < -0.05 ? `${fmtMoney(market.latest.compositeBenchmark)} sitting ${fmtPct(Math.abs(ins.fromPeakPct)).replace("+", "")} below the ${ins.peakMonth} peak` : "prices near their peak"}, the market sits in ${cond}. ${ins.bestPerformer.label} led property types at ${fmtPct(ins.bestPerformer.yoy)} YoY.`;
  const watch = latest.marketCondition === "buyer"
    ? `If borrowing costs hold, expect the buyer's lean to persist. Watch the Bank of Canada decision and next month's HPI release for the first sign of demand returning.`
    : latest.marketCondition === "seller"
      ? `Sellers hold the edge for now. If inventory builds, watch for the balance tipping — the next HPI release will show whether momentum is shifting.`
      : `With the market balanced, small rate or inventory shifts could tip it either way. The Bank of Canada decision and the next HPI release are the two to watch.`;
  return { means, watch };
}

function toneCls(v: number): string {
  const t = pctTone(v);
  return t === "neg" ? "text-red-700" : t === "pos" ? "text-green-700" : "text-muted";
}

/**
 * `market_stats` block — one market per block. Dot-point HPI stats,
 * Market Pulse chart (12mo/3yr), coverage note, auto-drafted narrative.
 * Data comes from the same hpi_markets table as the HPI trend pages.
 */
export async function MarketStats({ data }: BlockProps) {
  const slug = (data.market_slug as string) || "hamilton-burlington";
  const showChart = data.show_chart !== false;
  const showNarrative = data.show_narrative !== false;
  const market = await getHpiMarket(slug);
  if (!market) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-line bg-white p-6 text-[13px] leading-[1.5] text-muted">
        Market data for &ldquo;{slug}&rdquo; hasn&rsquo;t been uploaded yet. Add it from Admin &rarr; Market Data.
      </div>
    );
  }

  const coverage = HPI_MARKET_COVERAGE[slug];
  const { latest, history12m, fullHistory } = market;
  const pt = latest.propertyTypes;
  const points12m = history12m.map((h) => ({ month: h.month, value: h.compositeBenchmark }));
  const points3yr = fullHistory.slice(-36).map((h) => ({ month: h.month, value: h.compositeBenchmark }));
  const ins = computeInsights(market);
  const narrative = showNarrative ? draftNarrative(market) : null;

  const rows: { label: string; value: string; sub?: string; subTone?: string }[] = [
    { label: "Benchmark price", value: fmtMoney(latest.compositeBenchmark), sub: `${fmtPct(latest.momChange)} MoM`, subTone: toneCls(latest.momChange) },
    { label: "Year over year", value: fmtPct(latest.yoyChange), subTone: toneCls(latest.yoyChange) },
    {
      label: "Market condition",
      value: latest.marketCondition === "buyer" ? "Buyer's market" : latest.marketCondition === "seller" ? "Seller's market" : "Balanced",
    },
    { label: "Single-family", value: fmtMoney(pt.singleFamily.benchmark), sub: `${fmtPct(pt.singleFamily.momChange)} MoM`, subTone: toneCls(pt.singleFamily.momChange) },
    { label: "Townhouse", value: fmtMoney(pt.townhouse.benchmark), sub: `${fmtPct(pt.townhouse.momChange)} MoM`, subTone: toneCls(pt.townhouse.momChange) },
    { label: "Condo apartment", value: fmtMoney(pt.apartment.benchmark), sub: `${fmtPct(pt.apartment.momChange)} MoM`, subTone: toneCls(pt.apartment.momChange) },
  ];

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line bg-white shadow-[var(--shadow-card)]">
      <div className="px-6 pt-6 md:px-8">
        <h3 className="font-display text-xl font-bold tracking-tight">{market.name}</h3>
        {coverage && (
          <p className="mt-1 text-[13px] leading-[1.5] text-muted">Covers {coverage.replace(/ · /g, ", ")}</p>
        )}
      </div>
      <ul className="mx-6 mt-4 md:mx-8">
        {rows.map((r) => (
          <li key={r.label} className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 text-[13px] leading-[1.5] last:border-b-0">
            <span className="text-muted">{r.label}</span>
            <span className="text-right font-bold text-ink">
              {r.value}
              {r.sub && <span className={`block text-[13px] font-normal leading-[1.5] ${r.subTone ?? ""}`}>{r.sub}</span>}
            </span>
          </li>
        ))}
      </ul>
      {showChart && points3yr.length > 1 && (
        <div className="px-6 pb-2 md:px-8">
          <MarketStatsChart points12m={points12m} points3yr={points3yr} />
          <p className="mt-2 text-center text-[13px] leading-[1.5] text-muted">
            3-year benchmark trend &middot; peak to now {fmtPct(ins.fromPeakPct)}
          </p>
        </div>
      )}
      {narrative && (
        <div className="space-y-4 px-6 py-4 md:px-8">
          <div>
            <h4 className="mb-1 text-[13px] font-bold leading-[1.5] text-ink">What it means here</h4>
            <p className="text-[13px] leading-[1.5] text-muted">{narrative.means}</p>
          </div>
          <div>
            <h4 className="mb-1 text-[13px] font-bold leading-[1.5] text-ink">What to watch</h4>
            <p className="text-[13px] leading-[1.5] text-muted">{narrative.watch}</p>
          </div>
        </div>
      )}
      <p className="border-t border-line px-6 py-3 text-[13px] leading-[1.5] text-muted md:px-8">
        Source: CREA MLS&reg; HPI &middot; Updated {market.lastUpdated || "—"} &middot;{" "}
        <Link href={`/ontario-housing-market-trends/${market.slug}`} className="underline">Full trends</Link>
      </p>
    </div>
  );
}
