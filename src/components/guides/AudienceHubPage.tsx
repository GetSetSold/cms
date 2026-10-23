/** Audience hub page, e.g. /guides/buyers — same chrome as the guides hub,
 *  filtered to one audience, with its own SEO meta + JSON-LD. */
import Link from "next/link";
import { getSettings, getLogo } from "@/lib/cms";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { GUIDES, AUDIENCES, getGuidesByAudience, getAudienceMeta } from "@/lib/guides/registry";
import type { GuideAudience } from "@/lib/guides/types";
import { GuideTabs, TAB_PATH } from "./GuideTabs";
import { GuideAdSlot } from "./GuideAdSlot";

/** Monochrome line icon per audience — black & white, on-brand. */
function AudienceIcon({ audience }: { audience: GuideAudience }) {
  const p = {
    width: 88,
    height: 88,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;
  switch (audience) {
    case "Buyer": // house
      return (
        <svg {...p} aria-hidden>
          <path d="M4 11l8-7 8 7" />
          <path d="M6 9.5V20h12V9.5" />
          <path d="M10 20v-6h4v6" />
        </svg>
      );
    case "Seller": // price tag
      return (
        <svg {...p} aria-hidden>
          <path d="M20.6 13.4L12 22 2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z" />
          <circle cx="7.5" cy="7.5" r="1.5" />
        </svg>
      );
    case "Renter": // key
      return (
        <svg {...p} aria-hidden>
          <circle cx="8" cy="8" r="4.5" />
          <path d="M11.2 11.2L20 20" />
          <path d="M16.5 16.5l2.5-2.5" />
          <path d="M18.5 18.5l1.5-1.5" />
        </svg>
      );
    case "Landlord": // building
      return (
        <svg {...p} aria-hidden>
          <rect x="5" y="3" width="14" height="18" rx="1" />
          <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" />
          <path d="M10 21v-3h4v3" />
        </svg>
      );
  }
}

const AUDIENCE_BLURBS: Record<GuideAudience, string> = {  Buyer:
    "Every step of buying a home in Canada — mortgages, pre-approval, closing costs, bidding wars and inspections. Plain language, free PDF downloads.",
  Seller:
    "Pricing, staging, listing and negotiating the sale of your Canadian home — including how the 1% listing fee saves you thousands.",
  Renter:
    "Finding the right rental, tenant rights, leases and moving — practical guidance for renters across Ontario.",
  Landlord:
    "Screening tenants, leases, rent collection, maintenance and the legal side of being a landlord in Ontario.",
};

export async function AudienceHubPage({ audience }: { audience: GuideAudience }) {
  const meta = getAudienceMeta(audience);
  const guides = getGuidesByAudience(audience);
  const path = TAB_PATH[audience];
  const url = `https://www.getsetsold.ca${path}`;

  const settings = await getSettings();
  const logo = await getLogo(settings);
  const ads = (settings.ads ?? {}) as { guides_ad_enabled?: boolean; grid_ad_code?: string };
  const adCode = ads.grid_ad_code ?? "";
  const showAd = !!ads.guides_ad_enabled && /data-ad-client="/.test(adCode);

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Free ${meta.label} Real Estate Guides`,
    description: AUDIENCE_BLURBS[audience],
    url,
    numberOfItems: guides.length,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: guides.map((g, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: g.title,
        description: g.subtitle,
        url: `https://www.getsetsold.ca/guides/${g.id}`,
      })),
    },
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.getsetsold.ca" },
      { "@type": "ListItem", position: 2, name: "Guides", item: "https://www.getsetsold.ca/guides" },
      { "@type": "ListItem", position: 3, name: meta.label, item: url },
    ],
  };

  return (
    <div className="min-h-screen bg-ground text-ink" style={themeVars(settings)}>
      {themeFontHref(settings) ? <link rel="stylesheet" href={themeFontHref(settings)} /> : null}
      <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <SiteHeader settings={settings} logo={logo} />

      <div className="mx-auto max-w-7xl px-5 pb-8 pt-10">
        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[3fr_7fr] md:gap-8">
          <div className="hidden items-center justify-center md:flex" aria-hidden>
            <div className="flex h-44 w-44 items-center justify-center rounded-[var(--radius-lg)] bg-soft text-ink">
              <AudienceIcon audience={audience} />
            </div>
          </div>
          <div>
            <div className="text-[12px] font-bold uppercase tracking-[0.12em] text-accent">
              {guides.length} free guides · no signup
            </div>
            <h1 className="mt-2 font-display font-bold text-[30px] leading-[1.15] tracking-tight text-ink md:text-[28px] md:leading-[1.2]">
              Free {meta.label} Real Estate <span className="text-accent">Guides</span>
            </h1>
            <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted">
              {AUDIENCE_BLURBS[audience]}
            </p>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-5 pb-16">
        <nav className="py-3 text-[13px] text-muted" aria-label="Breadcrumb">
          <Link href="/" className="hover:underline">Home</Link> /{" "}
          <Link href="/guides" className="hover:underline">Guides</Link> / <span>{meta.label}</span>
        </nav>

        <div className="mb-6 mt-4">
          <GuideTabs guides={GUIDES} audiences={AUDIENCES} total={GUIDES.length} active={audience} />
        </div>

        {showAd && <GuideAdSlot adCode={adCode} className="my-8" />}
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
