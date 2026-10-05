import type { Metadata } from "next";
import Link from "next/link";
import { getSettings, getLogo } from "@/lib/cms";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { CALCULATORS, LEGACY_TAB_SLUGS, CALCULATOR_MAP } from "@/lib/calculators/registry";
import { LegacyHashRedirect } from "@/components/calculators/LegacyHashRedirect";
import { ContentAdSlot } from "@/components/ads/ContentAdSlot";
import { redirect } from "next/navigation";
import type { CalculatorCategory } from "@/lib/calculators/types";

export const metadata: Metadata = {
  title: "Free Canadian Mortgage & Real Estate Calculators | GetSetSold.ca",
  description:
    "14 free Canadian mortgage and real estate calculators: affordability, mortgage payments, land transfer tax, closing costs, buy vs rent, rental forecasts and more.",
  alternates: { canonical: "https://www.getsetsold.ca/calculators" },
};

const CATEGORIES: CalculatorCategory[] = [
  "Mortgage & Affordability",
  "Taxes & Closing Costs",
  "Buy vs Sell Decisions",
  "Investing",
];

export default async function CalculatorsHubPage({
  searchParams,
}: {
  searchParams?: Promise<{ c?: string }>;
}) {
  const c = (await searchParams)?.c;
  if (c) {
    const slug = LEGACY_TAB_SLUGS[c] ?? (CALCULATOR_MAP[c] ? c : null);
    if (slug) redirect(`/calculators/${slug}`);
  }
  const settings = await getSettings();
  const logo = await getLogo(settings);
  const ads = (settings.ads ?? {}) as Record<string, unknown>;
  const calcAdCode = typeof ads.grid_ad_code === "string" ? ads.grid_ad_code : "";
  const showCalcAd =
    ads.calculators_ad_enabled === true && calcAdCode.includes("data-ad-client");

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Real Estate Calculators",
    itemListElement: CALCULATORS.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.title,
      description: c.description,
      url: `https://www.getsetsold.ca/calculators/${c.slug}`,
    })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.getsetsold.ca" },
      { "@type": "ListItem", position: 2, name: "Calculators", item: "https://www.getsetsold.ca/calculators" },
    ],
  };

  return (
    <div className="min-h-screen bg-ground text-ink" style={themeVars(settings)}>
      {themeFontHref(settings) ? <link rel="stylesheet" href={themeFontHref(settings)} /> : null}
      <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <SiteHeader settings={settings} logo={logo} />
      <LegacyHashRedirect />
      <main className="mx-auto max-w-7xl px-5 pb-16">
        <nav className="pt-6 text-[13px] text-muted" aria-label="Breadcrumb">
          <Link href="/" className="hover:underline">Home</Link> / <span>Calculators</span>
        </nav>

        {/* Hero — split header: monochrome icon + eyebrow + H1 + stats */}
        <div className="mb-8 mt-2 pb-8 pt-8">
          <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[3fr_7fr] md:gap-8">
            <div className="hidden items-center justify-center md:flex" aria-hidden>
              <div className="flex h-44 w-44 items-center justify-center rounded-2xl bg-soft text-ink">
                <svg width="88" height="88" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8" /><path d="M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h.01M16 19h.01" /></svg>
              </div>
            </div>
            <div>
              <div className="text-[12px] font-bold uppercase tracking-[0.12em] text-accent">
                14 free calculators · no signup
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                Free Canadian Mortgage &amp; Real Estate <span className="text-accent">Calculators</span>
              </h1>
              <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted">
                14 free calculators to help you buy, sell, and invest with confidence — from affordability
                and mortgage payments to land transfer tax, closing costs, and rental forecasts.
                Download a PDF report from any calculator, or email it to yourself.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {[
                  { num: "14", lbl: "Free Calculators" },
                  { num: String(CATEGORIES.length), lbl: "Categories" },
                  { num: "100%", lbl: "Canada" },
                  { num: "Free", lbl: "No Signup" },
                ].map((s) => (
                  <div
                    key={s.lbl}
                    className="min-w-[100px] rounded-[10px] border border-line bg-white px-4 py-2.5 text-center shadow-sm"
                  >
                    <div className="text-xl font-black text-ink">{s.num}</div>
                    <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                      {s.lbl}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {CATEGORIES.map((cat) => {
          const items = CALCULATORS.filter((c) => c.category === cat);
          if (items.length === 0) return null;
          return (
            <section key={cat} className="mb-10">
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-[19px] font-bold text-ink">{cat}</h2>
                <div className="h-px flex-1 border-t border-line" />
                <span className="text-[12px] font-medium text-muted">{items.length} tools</span>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/calculators/${c.slug}`}
                    className="group relative flex flex-col rounded-[var(--radius-md)] border border-line bg-white p-5 shadow-[var(--shadow)] transition hover:border-accent"
                  >
                    {c.tag && (
                      <span className="absolute right-4 top-4 rounded-full bg-soft px-2.5 py-1 text-[11px] font-bold text-accent">
                        {c.tag}
                      </span>
                    )}
                    <h3 className="pr-16 text-[16px] font-bold text-ink group-hover:text-accent">{c.title}</h3>
                    <p className="mt-2 flex-1 text-[13.5px] leading-6 text-muted">{c.description}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-accent">
                      Open calculator <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
                    </span>
                    <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path d="M7 17L17 7M9 7h8v8" /></svg>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        {showCalcAd && <ContentAdSlot adCode={calcAdCode} className="mt-4" />}

        <article className="mt-4 rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-[14px] font-semibold text-ink">About these calculators</h2>
          <p className="text-[12px] leading-7 text-muted">
            All calculations use current Canadian mortgage rules, including the mortgage stress test,
            minimum down payment brackets, and CMHC insurance tiers. Figures are estimates for
            informational purposes only and are not financial advice. Tax rules shown reflect the
            assumptions dated in each calculator — confirm with your mortgage professional, lawyer,
            or accountant before making decisions.
          </p>
        </article>
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
