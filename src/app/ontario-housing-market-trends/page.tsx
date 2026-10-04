import type { Metadata } from "next";
import Link from "next/link";
import { getHpiMarkets, fmtMoney, fmtPct, pctTone } from "@/lib/hpi";
import { seoTitle } from "@/lib/seo";
import { getSettings, getLogo } from "@/lib/cms";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { getCityOgImage, ogImageMeta } from "@/lib/ogImage";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const title = await seoTitle("Ontario MLS® Housing Market Trends & HPI");
  const description =
    "Benchmark prices, monthly and yearly changes, and market conditions for all 28 Ontario real estate markets tracked by the CREA MLS® Home Price Index.";
  const ogImage = await getCityOgImage("Toronto").catch(() => undefined);
  return {
    title,
    description,
    alternates: { canonical: "/ontario-housing-market-trends" },
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

export default async function TrendsOverviewPage() {
  const settings = await getSettings();
  const [markets, logo] = await Promise.all([getHpiMarkets(), getLogo(settings)]);
  const sorted = [...markets].sort((a, b) => b.latest.compositeBenchmark - a.latest.compositeBenchmark);
  const updated = markets[0]?.lastUpdated ?? "";

  return (
    <div className="min-h-screen bg-white text-ink" style={themeVars(settings)}>
      {themeFontHref(settings) ? <link rel="stylesheet" href={themeFontHref(settings)} /> : null}
      <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} />
      <SiteHeader settings={settings} logo={logo} />
      <main className="mx-auto max-w-6xl px-5 pb-16">
        <nav className="pt-6 text-[13px] text-muted" aria-label="Breadcrumb">
          <Link href="/" className="hover:underline">Home</Link> / <span>Ontario Housing Market Trends</span>
        </nav>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">Ontario Housing Market Trends</h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted">
          Benchmark prices and market conditions for all {markets.length} Ontario real estate markets
          tracked by the Canadian Real Estate Association&apos;s MLS® Home Price Index.
          {updated ? ` Last updated ${updated}.` : ""}
        </p>

        {markets.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-line bg-white p-8 text-muted">
            Market data hasn&apos;t been uploaded yet. Add it from Admin → Market Data.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((m) => (
              <Link
                key={m.slug}
                href={`/ontario-housing-market-trends/${m.slug}`}
                className="relative flex flex-col rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line bg-white p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-md"
              >
                <span className="text-[11px] uppercase tracking-wider text-muted">{conditionLabel(m.latest.marketCondition)}</span>
                <span className="mt-1 text-lg font-bold tracking-tight">{m.name}</span>
                <span className="mt-2 text-2xl font-bold tracking-tight">{fmtMoney(m.latest.compositeBenchmark)}</span>
                <span className="text-[13px] text-muted">benchmark price</span>
                <div className="mt-3 flex gap-4 border-t border-line pt-3 text-[13px]">
                  <span>
                    <span className="text-muted">Monthly </span>
                    <b className={toneCls(m.latest.momChange)}>{fmtPct(m.latest.momChange)}</b>
                  </span>
                  <span>
                    <span className="text-muted">Yearly </span>
                    <b className={toneCls(m.latest.yoyChange)}>{fmtPct(m.latest.yoyChange)}</b>
                  </span>
                </div>
                <span
                  aria-hidden
                  className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black text-white"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17L17 7M7 7h10v10" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        <p className="mt-6 text-xs text-muted">
          Data source: Canadian Real Estate Association (CREA) — MLS® Home Price Index.
        </p>
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
