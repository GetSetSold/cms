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

export default async function TrendsOverviewPage() {
  const [markets, settings, logo] = await Promise.all([getHpiMarkets(), getSettings(), getLogo()]);
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
          <div className="mt-8 overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-black text-left">
                  <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-muted">Board Region</th>
                  <th className="px-4 py-3 text-right text-[11px] uppercase tracking-wider text-muted">Benchmark Price</th>
                  <th className="px-4 py-3 text-right text-[11px] uppercase tracking-wider text-muted">Monthly</th>
                  <th className="px-4 py-3 text-right text-[11px] uppercase tracking-wider text-muted">Yearly</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-muted">Condition</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((m) => (
                  <tr key={m.slug} className="border-b border-line last:border-0 hover:bg-soft">
                    <td className="px-4 py-3">
                      <Link href={`/ontario-housing-market-trends/${m.slug}`} className="font-medium hover:underline">
                        {m.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{fmtMoney(m.latest.compositeBenchmark)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${pctTone(m.latest.momChange) === "neg" ? "text-red-700" : pctTone(m.latest.momChange) === "pos" ? "text-green-700" : ""}`}>
                      {fmtPct(m.latest.momChange)}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${pctTone(m.latest.yoyChange) === "neg" ? "text-red-700" : pctTone(m.latest.yoyChange) === "pos" ? "text-green-700" : ""}`}>
                      {fmtPct(m.latest.yoyChange)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-full border border-black px-2.5 py-0.5 text-xs font-medium">
                        {conditionLabel(m.latest.marketCondition)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-6 text-xs text-muted">
          Data source: Canadian Real Estate Association (CREA) — MLS® Home Price Index.
        </p>
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
