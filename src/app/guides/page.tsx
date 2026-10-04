import type { Metadata } from "next";
import Link from "next/link";
import { getSettings, getLogo } from "@/lib/cms";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { seoTitle } from "@/lib/seo";
import { GUIDES, AUDIENCES, GUIDE_COUNT, LEGACY_IDS, getGuide } from "@/lib/guides/registry";
import { GuideTabs } from "@/components/guides/GuideTabs";
import { GuideHashRedirect } from "@/components/guides/GuideHashRedirect";
import { GuideAdSlot } from "@/components/guides/GuideAdSlot";
import { redirect } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const title = await seoTitle("Free Canadian Real Estate Guides");
  const description =
    "44 free Canadian real estate guides for buyers, sellers, renters and landlords. Expert advice for 2026 — read online or download the PDF.";
  return {
    title,
    description,
    alternates: { canonical: "https://www.getsetsold.ca/guides" },
    openGraph: { title, description, type: "website", url: "https://www.getsetsold.ca/guides" },
    twitter: { card: "summary", title, description },
  };
}

const HUB_FAQS = [
  {
    q: "What topics do the Canadian real estate guides cover?",
    a: "44 free guides covering home buying, selling, renting, and landlord topics including mortgages, closing costs, CMHC insurance, FHSA, bidding wars, home staging, tenant rights, eviction notices, property management, and more.",
  },
  {
    q: "Are the real estate guides really free?",
    a: "Yes, all 44 guides are completely free with no signup required. You can read them online or download any guide as a PDF.",
  },
  {
    q: "Can I download guides as PDF?",
    a: "Every guide has a Download PDF button that generates a professional PDF with cover page, content sections, checklists, and contact information. You can also email guides to yourself or others.",
  },
  {
    q: "Who writes these real estate guides?",
    a: "The guides are authored and maintained by Rohit Sharma, a licensed real estate agent with Lombard Group Real Estate Inc., serving Haldimand, Hamilton, Brant, Niagara, and Halton regions in Ontario, Canada.",
  },
  {
    q: "What is the 1% listing fee offer?",
    a: "GetSetSold.ca offers full-service real estate representation for as low as 1% listing commission, compared to the traditional 5% commission. This includes professional photography, MLS listing, marketing, negotiations, and full transaction management.",
  },
  {
    q: "How much buyer cash back can I get?",
    a: "Eligible buyers in the VIP Buyer Program can receive up to $5,000 cash back at closing when they purchase a property through GetSetSold.ca.",
  },
];

export default async function GuidesHubPage({
  searchParams,
}: {
  searchParams?: Promise<{ c?: string }>;
}) {
  // Legacy ?c=<guideId> → canonical
  const c = (await searchParams)?.c;
  if (c) {
    const id = (LEGACY_IDS as Record<string, string>)[c] ?? (getGuide(c) ? c : null);
    if (id) redirect(`/guides/${id}`);
  }

  const settings = await getSettings();
  const logo = await getLogo(settings);
  const ads = (settings.ads ?? {}) as {
    guides_ad_enabled?: boolean;
    grid_ad_code?: string;
  };
  const adCode = ads.grid_ad_code ?? "";
  const showAd = !!ads.guides_ad_enabled && /data-ad-client="/.test(adCode);

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Free Canadian Real Estate Guides",
    description:
      "44 free Canadian real estate guides for buyers, sellers, renters and landlords with PDF downloads.",
    url: "https://www.getsetsold.ca/guides",
    numberOfItems: GUIDE_COUNT,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: GUIDES.map((g, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: g.title,
        description: g.subtitle,
        url: `https://www.getsetsold.ca/guides/${g.id}`,
      })),
    },
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: HUB_FAQS.map((f) => ({
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
      { "@type": "ListItem", position: 2, name: "Guides", item: "https://www.getsetsold.ca/guides" },
    ],
  };

  const stats = [
    { num: String(GUIDE_COUNT), lbl: "Free Guides" },
    { num: String(AUDIENCES.length), lbl: "Audiences" },
    { num: "100%", lbl: "Canada" },
    { num: "Free", lbl: "No Signup" },
  ];

  return (
    <div className="min-h-screen bg-ground text-ink" style={themeVars(settings)}>
      {themeFontHref(settings) ? <link rel="stylesheet" href={themeFontHref(settings)} /> : null}
      <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <SiteHeader settings={settings} logo={logo} />
      <GuideHashRedirect />

      {/* Hero — site theme: dark ink gradient */}
      <div className="bg-gradient-to-br from-primary to-accent text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-5 pb-10 pt-14 text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-white" aria-hidden>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Free Canadian Real Estate Guides
          </h1>
          <p className="max-w-2xl text-[13px] text-white/75">
            {GUIDE_COUNT} expert guides covering every side of Canadian real estate — plain language,
            free PDF downloads, built for 2026
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {stats.map((s) => (
              <div
                key={s.lbl}
                className="min-w-[100px] rounded-[10px] border border-white/15 bg-white/10 px-4 py-2.5 text-center"
              >
                <div className="text-xl font-black">{s.num}</div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/70">
                  {s.lbl}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-5 pb-16">
        <nav className="pt-6 text-[13px] text-muted" aria-label="Breadcrumb">
          <Link href="/" className="hover:underline">Home</Link> / <span>Guides</span>
        </nav>

        <div className="mb-6 mt-4">
          <GuideTabs guides={GUIDES} audiences={AUDIENCES} total={GUIDE_COUNT} />
        </div>

        {showAd && <GuideAdSlot adCode={adCode} className="my-8" />}

        <article className="mt-4 rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-[14px] font-semibold text-ink">About these guides</h2>
          <p className="text-[12px] leading-7 text-muted">
            Every guide is written for Canadians — Ontario rules, CRA references, and 2026 market
            conditions throughout. Read any guide online, or download it as a professionally
            formatted PDF to keep. For informational purposes only — not legal, tax, or financial
            advice.
          </p>
        </article>
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
