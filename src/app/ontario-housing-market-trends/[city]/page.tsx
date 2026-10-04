import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getHpiMarket, getHpiMarkets, computeInsights, ontarioAverageBenchmark,
  fmtMoney, fmtPct, pctTone,
} from "@/lib/hpi";
import { seoTitle } from "@/lib/seo";
import { getSettings, getLogo } from "@/lib/cms";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { getHoodOgImage, ogImageMeta } from "@/lib/ogImage";
import { HpiChart, HpiSpark } from "@/components/hpi/HpiChart";
import { HpiRangeChart } from "@/components/hpi/HpiRangeChart";
import { TrendsAdSlot } from "@/components/hpi/TrendsAdSlot";

export const dynamic = "force-dynamic";

type Params = { city: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { city } = await params;
  const market = await getHpiMarket(city);
  if (!market) return { title: "Not found" };
  const title = await seoTitle(`${market.name} Housing Market Trends & HPI`);
  const description = `${market.name} benchmark price ${fmtMoney(market.latest.compositeBenchmark)}, ${fmtPct(market.latest.yoyChange)} year over year. Full MLS® Home Price Index trends, charts and market insights.`;
  const ogImage = await getHoodOgImage(market.name, null).catch(() => null);
  return {
    title,
    description,
    alternates: { canonical: `/ontario-housing-market-trends/${market.slug}` },
    ...ogImageMeta(ogImage, title, description),
  };
}

function conditionLabel(c: string) {
  return c === "buyer" ? "Buyer's Market" : c === "seller" ? "Seller's Market" : "Balanced Market";
}
function toneCls(v: number) {
  const t = pctTone(v);
  return t === "neg" ? "text-red-700" : t === "pos" ? "text-green-700" : "text-ink";
}

const PT_ROWS = [
  ["singleFamily", "Single Family"],
  ["oneStorey", "One Storey"],
  ["twoStorey", "Two Storey"],
  ["townhouse", "Townhouse"],
  ["apartment", "Apartment / Condo"],
] as const;

export default async function TrendsDetailPage({ params }: { params: Promise<Params> }) {
  const { city } = await params;
  const market = await getHpiMarket(city);
  if (!market) notFound();

  const [markets, settings, logo, ontAvg] = await Promise.all([
    getHpiMarkets(), getSettings(), getLogo(), ontarioAverageBenchmark(),
  ]);
  const ins = computeInsights(market);
  const L = market.latest;
  const ticker = [...markets].sort((a, b) => a.name.localeCompare(b.name));
  const compare = [...markets].sort((a, b) => b.latest.compositeBenchmark - a.latest.compositeBenchmark);
  const affordPct = ontAvg ? Math.round((L.compositeBenchmark / ontAvg) * 100) : null;

  const points12 = market.history12m.map((h) => ({ month: h.month, value: h.compositeBenchmark, hpi: h.compositeHPI }));
  const fullPoints = market.fullHistory.map((h) => ({ month: h.month, value: h.compositeBenchmark, hpi: h.compositeHPI }));

  const insights: { label: string; value: string; sub: string }[] = [
    { label: "Price Recovery from Peak", value: fmtMoney(L.compositeBenchmark), sub: `vs peak ${fmtMoney(ins.peak)} · ${ins.peakMonth}` },
    { label: "Quarter-over-Quarter", value: fmtPct(ins.qoqPct), sub: "price change, last 3 months" },
    { label: "3-Year Total Return", value: ins.y3Pct != null ? fmtPct(ins.y3Pct) : "—", sub: "trailing 36 months" },
    { label: "5-Year Total Return", value: ins.y5Pct != null ? fmtPct(ins.y5Pct) : "—", sub: "trailing 60 months" },
    { label: "Price Volatility", value: ins.volatility, sub: `std dev of monthly changes: ${ins.volatilityStd}%` },
    { label: "Affordability vs Ontario", value: affordPct != null ? `${affordPct}%` : "—", sub: ontAvg ? `Ontario avg ${fmtMoney(ontAvg)}` : "" },
    { label: "Historical Low (Trough)", value: fmtMoney(ins.trough), sub: `${ins.troughMonth} · ${fmtPct(ins.aboveTroughPct)} above low` },
    { label: "Condo vs House Gap", value: fmtMoney(ins.condoHouseGap), sub: "single-family costs more than condos" },
    { label: "Best Performer", value: `${ins.bestPerformer.label} ${fmtPct(ins.bestPerformer.yoy)}`, sub: `worst: ${ins.worstPerformer.label} ${fmtPct(ins.worstPerformer.yoy)}` },
    { label: "Market Momentum Score", value: `${ins.momentumScore}/10`, sub: `${ins.momentumLabel} — trend, volatility & conditions` },
  ];

  return (
    <div className="min-h-screen bg-white text-ink" style={themeVars(settings)}>
      {themeFontHref(settings) ? <link rel="stylesheet" href={themeFontHref(settings)} /> : null}
      <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} />
      <SiteHeader settings={settings} logo={logo} />
      <main className="mx-auto max-w-6xl px-5 pb-16">
        <nav className="pt-6 text-[13px] text-muted" aria-label="Breadcrumb">
          <Link href="/" className="hover:underline">Home</Link> /{" "}
          <Link href="/ontario-housing-market-trends" className="hover:underline">Market Trends</Link> /{" "}
          <span>{market.name}</span>
        </nav>

        {/* Header — wraps cleanly, no overflow */}
        <div className="mt-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight">{market.name} Housing Market Trends</h1>
            <p className="mt-2 text-[15px] text-muted">
              Benchmark price <b className="text-ink">{fmtMoney(L.compositeBenchmark)}</b>
              {" · "}<span className={toneCls(L.yoyChange)}>{fmtPct(L.yoyChange)}</span> yearly change
            </p>
          </div>
          <span className="inline-block shrink-0 rounded-full border border-black px-3 py-1 text-xs font-semibold">
            {conditionLabel(L.marketCondition)}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted">MLS® Home Price Index Data · Source: CREA · Last updated {market.lastUpdated}</p>

        {/* Ticker — scrollbar hidden, still scrollable */}
        <div
          className="mt-5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="All Ontario markets"
        >
          {ticker.map((m) => (
            <Link
              key={m.slug}
              href={`/ontario-housing-market-trends/${m.slug}`}
              className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-[13px] ${
                m.slug === market.slug ? "border-black bg-black text-white" : "border-line bg-white hover:border-black"
              }`}
            >
              <span>{m.name}</span>
              <b className={m.slug === market.slug ? "" : toneCls(m.latest.momChange)}>{fmtPct(m.latest.momChange)}</b>
            </Link>
          ))}
        </div>

        {/* Key metrics */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { l: "Composite Benchmark", v: fmtMoney(L.compositeBenchmark), s: `${fmtPct(L.momChange)} from last month · HPI ${L.compositeHPI}` },
            { l: "Monthly Change", v: fmtPct(L.momChange), s: "month over month", tone: toneCls(L.momChange) },
            { l: "Yearly Change", v: fmtPct(L.yoyChange), s: "year over year", tone: toneCls(L.yoyChange) },
            { l: "All-Time Peak", v: fmtMoney(ins.peak), s: `${fmtPct(ins.fromPeakPct)} from peak · ${ins.peakMonth}` },
          ].map((c) => (
            <div key={c.l} className="rounded-xl border border-line bg-white p-4">
              <span className="text-[11px] uppercase tracking-wider text-muted">{c.l}</span>
              <div className={`mt-1 text-2xl font-bold tracking-tight ${c.tone ?? ""}`}>{c.v}</div>
              <span className="text-[13px] text-muted">{c.s}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-black bg-soft p-4">
          <b>{conditionLabel(L.marketCondition)} — {market.name}.</b>{" "}
          <span className="text-muted">
            {L.marketCondition === "buyer"
              ? "Prices are declining. Higher inventory gives buyers more negotiating power."
              : L.marketCondition === "seller"
                ? "Prices are rising. Low inventory gives sellers the advantage."
                : "Supply and demand are roughly balanced."}
          </span>
        </div>

        {/* Market Insights */}
        <h2 className="mt-10 text-xl font-bold">Market Insights</h2>
        <p className="mb-4 text-sm text-muted">Key signals computed from full price history</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {insights.map((c) => (
            <div key={c.label} className="rounded-xl border border-line bg-white p-4">
              <span className="block text-[11px] uppercase tracking-wider text-muted">{c.label}</span>
              <b className="mt-1.5 block text-lg font-bold tracking-tight">{c.value}</b>
              <span className="mt-0.5 block text-xs text-muted">{c.sub}</span>
            </div>
          ))}
        </div>

        {/* 12-month chart */}
        <h2 className="mt-10 text-xl font-bold">Benchmark Price Trend</h2>
        <p className="mb-4 text-sm text-muted">12-month composite benchmark price</p>
        <div className="rounded-2xl border border-line bg-white p-5">
          <HpiChart points={points12} height={240} />
        </div>

        {/* Full history */}
        <h2 className="mt-10 text-xl font-bold">Benchmark Price Over Time</h2>
        <p className="mb-4 text-sm text-muted">Composite benchmark price history</p>
        <div className="rounded-2xl border border-line bg-white p-5">
          <HpiRangeChart history={market.fullHistory} height={260} />
        </div>

        <h2 className="mt-10 text-xl font-bold">HPI Index Over Time</h2>
        <p className="mb-4 text-sm text-muted">Composite HPI (base 100)</p>
        <div className="rounded-2xl border border-line bg-white p-5">
          <HpiRangeChart history={market.fullHistory} height={260} valueKey="compositeHPI" />
        </div>

        {/* Property type breakdown */}
        <h2 className="mt-10 text-xl font-bold">Property Type Breakdown</h2>
        <p className="mb-4 text-sm text-muted">Latest benchmark prices by type</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {PT_ROWS.map(([k, label]) => {
            const pt = L.propertyTypes[k];
            return (
              <div key={k} className="rounded-xl border border-line bg-white p-4">
                <span className="block text-xs text-muted">{label}</span>
                <b className="mt-1 block text-lg font-bold">{fmtMoney(pt.benchmark)}</b>
                <span className="mt-0.5 block text-xs text-muted">HPI {pt.hpi}</span>
                <div className="mt-2 flex justify-between border-t border-line pt-2 text-[13px]">
                  <span className="text-muted">Monthly</span><b className={toneCls(pt.momChange)}>{fmtPct(pt.momChange)}</b>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted">Yearly</span><b className={toneCls(pt.yoyChange)}>{fmtPct(pt.yoyChange)}</b>
                </div>
              </div>
            );
          })}
        </div>

        <TrendsAdSlot />

        {/* Property type details table */}
        <h2 className="mt-10 text-xl font-bold">Property Type Details</h2>
        <p className="mb-4 text-sm text-muted">Detailed breakdown for {market.name}</p>
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-black text-left">
                <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-muted">Property Type</th>
                <th className="px-4 py-3 text-right text-[11px] uppercase tracking-wider text-muted">Benchmark</th>
                <th className="px-4 py-3 text-right text-[11px] uppercase tracking-wider text-muted">HPI Index</th>
                <th className="px-4 py-3 text-right text-[11px] uppercase tracking-wider text-muted">Monthly</th>
                <th className="px-4 py-3 text-right text-[11px] uppercase tracking-wider text-muted">Yearly</th>
                <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-muted">12-Month Trend</th>
                <th className="px-4 py-3 text-right text-[11px] uppercase tracking-wider text-muted">Perf. Rank</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line bg-soft font-semibold">
                <td className="px-4 py-3">Composite</td>
                <td className="px-4 py-3 text-right">{fmtMoney(L.compositeBenchmark)}</td>
                <td className="px-4 py-3 text-right">{L.compositeHPI}</td>
                <td className={`px-4 py-3 text-right ${toneCls(L.momChange)}`}>{fmtPct(L.momChange)}</td>
                <td className={`px-4 py-3 text-right ${toneCls(L.yoyChange)}`}>{fmtPct(L.yoyChange)}</td>
                <td className="px-4 py-3">—</td>
                <td className="px-4 py-3 text-right">—</td>
              </tr>
              {PT_ROWS.map(([k, label]) => {
                const pt = L.propertyTypes[k];
                const sparkVals = market.history12m
                  .map((h) => h[`${k}Benchmark` as keyof typeof h] as number | undefined)
                  .filter((v): v is number => typeof v === "number");
                const rank = [...PT_ROWS].sort((a, b) => L.propertyTypes[b[0]].yoyChange - L.propertyTypes[a[0]].yoyChange).findIndex(([kk]) => kk === k) + 1;
                return (
                  <tr key={k} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">{label}</td>
                    <td className="px-4 py-3 text-right font-medium">{fmtMoney(pt.benchmark)}</td>
                    <td className="px-4 py-3 text-right">{pt.hpi}</td>
                    <td className={`px-4 py-3 text-right ${toneCls(pt.momChange)}`}>{fmtPct(pt.momChange)}</td>
                    <td className={`px-4 py-3 text-right ${toneCls(pt.yoyChange)}`}>{fmtPct(pt.yoyChange)}</td>
                    <td className="px-4 py-3"><HpiSpark values={sparkVals} /></td>
                    <td className="px-4 py-3 text-right">#{rank}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* All markets comparison */}
        <h2 className="mt-10 text-xl font-bold">All Ontario Markets</h2>
        <p className="mb-4 text-sm text-muted">Compare benchmark prices and changes across all {markets.length} Ontario markets.</p>
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-black text-left">
                <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-muted">Board Region</th>
                <th className="px-4 py-3 text-right text-[11px] uppercase tracking-wider text-muted">Benchmark</th>
                <th className="px-4 py-3 text-right text-[11px] uppercase tracking-wider text-muted">Monthly</th>
                <th className="px-4 py-3 text-right text-[11px] uppercase tracking-wider text-muted">Yearly</th>
                <th className="px-4 py-3 text-right text-[11px] uppercase tracking-wider text-muted">Peak</th>
                <th className="px-4 py-3 text-right text-[11px] uppercase tracking-wider text-muted">From Peak</th>
                <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-muted">Condition</th>
              </tr>
            </thead>
            <tbody>
              {compare.map((m) => {
                const mi = computeInsights(m);
                const cur = m.slug === market.slug;
                return (
                  <tr key={m.slug} className={`border-b border-line last:border-0 ${cur ? "bg-soft font-semibold" : "hover:bg-soft"}`}>
                    <td className="px-4 py-3">
                      <Link href={`/ontario-housing-market-trends/${m.slug}`} className="hover:underline">{m.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-right">{fmtMoney(m.latest.compositeBenchmark)}</td>
                    <td className={`px-4 py-3 text-right ${toneCls(m.latest.momChange)}`}>{fmtPct(m.latest.momChange)}</td>
                    <td className={`px-4 py-3 text-right ${toneCls(m.latest.yoyChange)}`}>{fmtPct(m.latest.yoyChange)}</td>
                    <td className="px-4 py-3 text-right text-muted">{mi.peakMonth} {fmtMoney(mi.peak)}</td>
                    <td className={`px-4 py-3 text-right ${toneCls(mi.fromPeakPct)}`}>{fmtPct(mi.fromPeakPct)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-full border border-black px-2.5 py-0.5 text-xs">{conditionLabel(m.latest.marketCondition)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-10 rounded-2xl border border-black p-6 text-center">
          <h3 className="text-lg font-bold">Looking to Buy a Property?</h3>
          <p className="mt-1 text-sm text-muted">Browse active MLS® listings or contact our team for expert guidance.</p>
          <Link href="/listings" className="mt-4 inline-block rounded-lg bg-black px-6 py-2.5 text-sm font-semibold text-white">
            Browse Listings
          </Link>
        </div>

        <p className="mt-6 text-xs text-muted">
          Data source: Canadian Real Estate Association (CREA) — MLS® Home Price Index. Last updated {market.lastUpdated}.
        </p>
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
