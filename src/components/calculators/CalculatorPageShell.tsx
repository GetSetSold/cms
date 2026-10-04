import Link from "next/link";
import { getSettings, getLogo } from "@/lib/cms";
import { themeFontHref, themeIconOverrideCSS, themeVars } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { CALCULATOR_MAP, getCalculator } from "@/lib/calculators/registry";
import { CalculatorNav } from "@/components/calculators/CalculatorNav";
import type { CalculatorFaq } from "@/lib/calculators/types";
import type { ReactNode } from "react";

/**
 * Shared page chrome for every calculator detail page.
 * Mirrors the BoC rates guide integration: CMS header/footer, max-w-7xl,
 * breadcrumb, block-header system, FAQ + JSON-LD schema.
 */
export async function CalculatorPageShell({
  slug,
  intro,
  children,
  extraFaqs = [],
}: {
  slug: string;
  intro: string;
  children: ReactNode;
  extraFaqs?: CalculatorFaq[];
}) {
  const meta = getCalculator(slug);
  if (!meta) throw new Error(`Unknown calculator slug: ${slug}`);
  const settings = await getSettings();
  const logo = await getLogo(settings);

  const faqs = [...meta.faqs, ...extraFaqs];
  const canonical = `https://www.getsetsold.ca/calculators/${slug}`;
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.getsetsold.ca" },
      { "@type": "ListItem", position: 2, name: "Calculators", item: "https://www.getsetsold.ca/calculators" },
      { "@type": "ListItem", position: 3, name: meta.title, item: canonical },
    ],
  };
  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: meta.title,
    url: canonical,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    description: meta.seoDescription,
    offers: { "@type": "Offer", price: "0", priceCurrency: "CAD" },
  };

  return (
    <div className="min-h-screen bg-ground text-ink" style={themeVars(settings)}>
      {themeFontHref(settings) ? <link rel="stylesheet" href={themeFontHref(settings)} /> : null}
      <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }} />
      <SiteHeader settings={settings} logo={logo} />
      <main className="mx-auto max-w-7xl px-5 pb-16">
        <nav className="pt-6 text-[13px] text-muted" aria-label="Breadcrumb">
          <Link href="/" className="hover:underline">Home</Link>
          {" / "}
          <Link href="/calculators" className="hover:underline">Calculators</Link>
          {" / "}
          <span>{meta.title}</span>
        </nav>

        <div className="mb-6 mt-2 flex flex-col gap-3">
          <div className="text-sm font-semibold uppercase tracking-wide text-accent">{meta.category}</div>
          <h1 className="text-3xl font-bold tracking-tight">{meta.title}</h1>
          <div className="h-px w-full border-t border-line" />
          <p className="max-w-3xl text-[15px] leading-relaxed text-muted">{intro}</p>
        </div>

        {children}

        <CalculatorNav currentSlug={slug} />

        {faqs.length > 0 && (
          <>
            <div className="mb-5 mt-10 flex flex-col gap-3">
              <div className="text-sm font-semibold uppercase tracking-wide text-accent">FAQ</div>
              <h2 className="text-[26px] font-bold leading-tight tracking-tight text-ink">Frequently Asked Questions</h2>
              <div className="h-px w-full border-t border-line" />
              <p className="text-[15px] font-medium leading-relaxed text-muted">Answers to common questions about the {meta.title.toLowerCase()}</p>
            </div>
            <article className="rounded-lg border border-line bg-white px-6 py-2 shadow-sm">
              {faqs.map((f, i) => (
                <details key={f.q} className={`group py-3.5 ${i > 0 ? "border-t border-line" : ""}`} open={i === 0}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
                    <span>{f.q}</span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-soft text-lg leading-none text-ink">
                      <span className="group-open:hidden" aria-hidden>+</span>
                      <span className="hidden group-open:block" aria-hidden>−</span>
                    </span>
                  </summary>
                  <p className="mt-2 pr-12 text-[14px] text-muted">{f.a}</p>
                </details>
              ))}
            </article>
          </>
        )}

        <article className="mb-2 mt-10 rounded-lg border border-line bg-white p-5 shadow-sm">
          <h3 className="mb-2 text-[14px] font-semibold text-ink">About these calculations</h3>
          <p className="text-[12px] leading-7 text-muted">
            Calculations use current Canadian mortgage rules, including the mortgage stress test and
            CMHC insurance tiers. For informational purposes only — not financial advice. Confirm
            details with your mortgage professional before making decisions.
          </p>
        </article>
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}

export { CALCULATOR_MAP };
