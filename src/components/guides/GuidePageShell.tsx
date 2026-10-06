import Link from "next/link";
import { getSettings, getLogo } from "@/lib/cms";
import { themeFontHref, themeIconOverrideCSS, themeVars } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { getGuide } from "@/lib/guides/registry";
import type { ReactNode } from "react";

/**
 * Shared page chrome for every guide detail page.
 * Mirrors CalculatorPageShell: CMS header/footer, max-w-7xl,
 * breadcrumb, block-header system, JSON-LD schema.
 */
export async function GuidePageShell({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const meta = getGuide(slug);
  if (!meta) throw new Error(`Unknown guide slug: ${slug}`);
  const settings = await getSettings();
  const logo = await getLogo(settings);

  const canonical = `https://www.getsetsold.ca/guides/${slug}`;
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.getsetsold.ca" },
      { "@type": "ListItem", position: 2, name: "Guides", item: "https://www.getsetsold.ca/guides" },
      { "@type": "ListItem", position: 3, name: meta.title, item: canonical },
    ],
  };
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.title,
    description: meta.subtitle,
    url: canonical,
    inLanguage: "en-CA",
    author: {
      "@type": "Person",
      name: "Rohit Sharma",
      jobTitle: "Licensed Real Estate Agent",
      url: "https://www.getsetsold.ca",
    },
    publisher: {
      "@type": "Organization",
      name: "GetSetSold.ca",
      url: "https://www.getsetsold.ca",
    },
  };

  return (
    <div className="min-h-screen bg-ground text-ink" style={themeVars(settings)}>
      {themeFontHref(settings) ? <link rel="stylesheet" href={themeFontHref(settings)} /> : null}
      <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <SiteHeader settings={settings} logo={logo} />
      <main className="mx-auto max-w-7xl px-5 pb-16">
        <nav className="pt-6 text-[13px] text-muted" aria-label="Breadcrumb">
          <Link href="/" className="hover:underline">Home</Link>
          {" / "}
          <Link href="/guides" className="hover:underline">Guides</Link>
          {" / "}
          <span>{meta.title}</span>
        </nav>

        <div className="mb-6 mt-2 flex flex-col gap-3">
          <div className="text-[12px] font-bold uppercase tracking-[0.12em] text-accent">
            {meta.tag}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{meta.title}</h1>
          <div className="h-px w-full border-t border-line" />
          <p className="max-w-3xl text-[15px] leading-relaxed text-muted">{meta.subtitle}</p>
        </div>

        {children}

        <article className="mb-2 mt-10 rounded-[var(--radius-md)] border border-line bg-white p-5 shadow-[var(--shadow-card)]">
          <h3 className="mb-2 text-[14px] font-semibold text-ink">About these guides</h3>
          <p className="text-[12px] leading-7 text-muted">
            These guides are written for Canadian buyers, sellers, renters, and landlords and are
            kept current for 2026. They are for informational purposes only — not legal, tax, or
            financial advice. Rules vary by province; confirm details with your lawyer, accountant,
            or licensed real estate professional before making decisions.
          </p>
        </article>
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
