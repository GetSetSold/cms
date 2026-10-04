import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSettings } from "@/lib/cms";
import { seoTitle } from "@/lib/seo";
import {
  GUIDES,
  LEGACY_IDS,
  getGuide,
  getGuidesByAudience,
  getAudienceMeta,
} from "@/lib/guides/registry";
import { GUIDE_CONTENT } from "@/lib/guides/content";
import { GuidePageShell } from "@/components/guides/GuidePageShell";
import { GuideContent } from "@/components/guides/GuideContent";
import { GuideReportButtons } from "@/components/guides/GuideReportButtons";
import { GuideAdSlot } from "@/components/guides/GuideAdSlot";
import { GuideHashRedirect } from "@/components/guides/GuideHashRedirect";

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ c?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const meta = getGuide(slug);
  if (!meta) return {};
  const title = await seoTitle(meta.seoTitle);
  return {
    title,
    description: meta.seoDescription,
    alternates: { canonical: `https://www.getsetsold.ca/guides/${slug}` },
    openGraph: { title, description: meta.seoDescription, type: "article", url: `https://www.getsetsold.ca/guides/${slug}` },
    twitter: { card: "summary", title, description: meta.seoDescription },
  };
}

const OFFERS = [
  {
    kicker: "For Sellers",
    title: "Pay As Low As 1% Listing Fee!",
    text: "Full-service real estate — no compromise on quality. Satisfaction guaranteed or cancel anytime.",
    href: "https://www.getsetsold.ca/selling-your-home",
    cta: "Explore Listing Offer",
  },
  {
    kicker: "For Buyers",
    title: "Get Up To $5,000 Buyer Cash Back!",
    text: "Join the VIP Buyer Program — earn real cash back at closing when you purchase with us.",
    href: "https://www.getsetsold.ca/buying-a-home",
    cta: "Join Buyer Program",
  },
  {
    kicker: "Our Reviews",
    title: "What Clients Are Saying",
    text: "Rated 5 stars for service, results, and savings. Real experiences from buyers & sellers.",
    href: "https://www.getsetsold.ca/reviews",
    cta: "Read All Reviews",
  },
];

export default async function GuideDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;

  // Legacy ?c=<guideId> → canonical
  const c = (await searchParams)?.c;
  if (c) {
    const id = (LEGACY_IDS as Record<string, string>)[c] ?? (getGuide(c) ? c : null);
    if (id && id !== slug) redirect(`/guides/${id}`);
  }

  const guide = getGuide(slug) ?? notFound();

  const sections = GUIDE_CONTENT[slug] ?? [];

  const settings = await getSettings();
  const ads = (settings.ads ?? {}) as {
    guides_ad_enabled?: boolean;
    grid_ad_code?: string;
  };
  const adCode = ads.grid_ad_code ?? "";
  const showAd = !!ads.guides_ad_enabled && /data-ad-client="/.test(adCode);

  const audience = getAudienceMeta(guide.audience);
  const moreGuides = [
    ...getGuidesByAudience(guide.audience).filter((g) => g.id !== guide.id),
    ...GUIDES.filter((g) => g.audience !== guide.audience),
  ].slice(0, 7);

  return (
    <GuidePageShell slug={slug}>
      <GuideHashRedirect />
      <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <GuideContent guide={guide} sections={sections} />
          {showAd && <GuideAdSlot adCode={adCode} className="mt-6" />}
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          <GuideReportButtons guide={guide} sections={sections} />
          {showAd && <GuideAdSlot adCode={adCode} />}

          <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
            <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">
              More Guides
            </h4>
            <div className="flex flex-col">
              {moreGuides.map((g) => (
                <Link
                  key={g.id}
                  href={`/guides/${g.id}`}
                  className="flex items-center gap-2.5 border-b border-line py-2 text-[12.5px] font-medium text-ink transition last:border-b-0 hover:text-accent"
                >
                  <span className="line-clamp-1">{g.title}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-primary p-4 text-center text-white shadow-sm">
            <p className="text-[13px] font-bold">More {audience?.label ?? "guides"}</p>
            <p className="mt-1 text-[12px] text-white/75">
              Browse every guide for {guide.tag.toLowerCase().replace("for ", "")}.
            </p>
            <Link
              href="/guides"
              className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-[12px] font-bold text-white transition hover:opacity-90"
            >
              All Guides
            </Link>
          </div>
        </aside>
      </div>

      {/* Offers — site block style: eyebrow kicker + hairline divider */}
      <section className="mt-10 border-t border-line pt-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {OFFERS.map((o) => (
            <div key={o.kicker} className="flex min-h-[190px] flex-col rounded-xl border border-line bg-white p-5 shadow-sm">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent">
                {o.kicker}
              </div>
              <h3 className="mt-2 text-[15px] font-bold text-ink">{o.title}</h3>
              <div className="my-3 h-px w-full bg-line" />
              <p className="flex-1 text-[13px] leading-relaxed text-muted">{o.text}</p>
              <a
                href={o.href}
                target="_blank"
                rel="noopener"
                className="mt-4 inline-flex items-center gap-1.5 self-start text-[13px] font-bold text-accent transition hover:underline"
              >
                {o.cta} <span aria-hidden>→</span>
              </a>
            </div>
          ))}
        </div>
      </section>
    </GuidePageShell>
  );
}
