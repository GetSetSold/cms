import type { SiteSettings, SvgAsset } from "@/lib/types";
import type { CityStats } from "@/lib/cityStats";
import { Svg } from "../site/Svg";

const fmtMoney = (n: number | null) =>
  n == null ? null : n >= 1000000
    ? `$${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}M`
    : n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`;

/**
 * "Meet your local expert" section for city + neighbourhood pages (v1B compact).
 * Agent details come from Settings → Local Expert; city name + live stats
 * interpolate per page. Includes RealEstateAgent JSON-LD for SEO.
 */
export function LocalExpertSection({
  settings,
  photo,
  areaName,
  stats,
}: {
  settings: SiteSettings;
  photo?: SvgAsset | null;
  areaName: string;
  stats: CityStats;
}) {
  const le = settings.local_expert ?? {};
  if (le.enabled === false) return null;
  const agent = settings.agent ?? {};

  const name = agent.name || "Rohit Sharma";
  const title = agent.title || "REALTOR®";
  const brokerage = agent.brokerage || "Lombard Group Real Estate Inc., Brokerage";
  const phone = agent.phone || "";
  const serviceAreaRaw = le.service_area || "Serving {city} & surrounding areas";
  const serviceArea = serviceAreaRaw.replace("{city}", areaName);
  const rating = le.review_rating || "5.0";
  const reviewCount = le.review_count || "63";
  const listingFee = le.listing_fee || "1%";
  const cashback = le.cashback || "$5,000";
  const valuationUrl = le.valuation_url || "/home-valuation";
  const callLabel = le.call_label || "Call Rohit Today";
  const reviewUrl = le.review_url || "";
  const aboutUrl = le.about_url || "/about";
  const firstName = name.split(" ")[0];
  const photoLabel = `${name}, real estate agent in ${areaName}`;

  const median = fmtMoney(stats.medianSalePrice);
  const medianHtml = median ? ` with a <strong>${median}</strong> median` : "";

  // Market-condition templates: same component, different copy per market
  // shape — keeps 1,900 pages from reading as spun content.
  const n = stats.activeCount;
  let take: string;
  if (n > 0 && n < 40) {
    take = `Only <strong>${n} active listings</strong> in ${areaName}${medianHtml} — inventory is tight, so well-priced homes move fast. Selling? This is your window. Buying? You need someone who gets you in first.`;
  } else if (n >= 150) {
    take = `<strong>${n} active listings</strong> in ${areaName}${medianHtml} — buyers have real choice and negotiating room right now. Whether you're buying below ask or selling against competition, strategy decides who wins.`;
  } else if (n > 0) {
    take = `<strong>${n} active listings</strong> in ${areaName}${medianHtml} — a balanced market where pricing strategy decides who wins. <strong>Ask me what your street is doing.</strong>`;
  } else {
    take = `Tracking every listing in ${areaName}${medianHtml}. <strong>Ask me what your street is doing.</strong>`;
  }

  const schema = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name,
    jobTitle: title,
    areaServed: { "@type": "City", name: areaName },
    ...(phone ? { telephone: phone } : {}),
    ...(brokerage ? { memberOf: { "@type": "RealEstateAgent", name: brokerage } } : {}),
    aggregateRating: { "@type": "AggregateRating", ratingValue: rating, reviewCount },
  };

  return (
    <section className="mt-12 rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line bg-white p-6 md:p-7" aria-label={`Meet your ${areaName} real estate expert`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-6">
        {photo ? (
          <Svg asset={photo} label={photoLabel} className="h-20 w-20 shrink-0 rounded-full object-cover" style={{ width: 84, height: 84 }} />
        ) : (
          <div className="flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-full bg-soft text-xs text-muted">Photo</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-[1.5px] text-accent">Meet your {areaName} expert</div>
          <h2 className="mt-1 font-display text-xl">{name}</h2>
          <div className="mt-0.5 text-[13px] text-muted">{title} · {brokerage}</div>
          <div className="mt-1.5 text-[13px] text-ink">
            <span className="tracking-[2px]">★★★★★</span>{" "}
            {reviewUrl ? (
              <a href={reviewUrl} target="_blank" rel="noopener" className="whitespace-nowrap font-medium text-accent hover:underline">
                {rating} · {reviewCount} Google reviews
              </a>
            ) : (
              <span className="whitespace-nowrap">{rating} · {reviewCount} Google reviews</span>
            )}
            {" · "}{serviceArea}
            {" · "}
            <a href={aboutUrl} className="font-medium text-accent hover:underline">More about {firstName} →</a>
          </div>
          <p
            className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink"
            dangerouslySetInnerHTML={{ __html: take }}
          />
          <div className="mt-2.5 flex flex-wrap gap-2">
            {[`${listingFee} listing fee`, `${cashback} buyer cash-back`, "Free valuations"].map((c) => (
              <span key={c} className="rounded-[var(--radius-label)] bg-soft px-3 py-1 text-[12px] text-ink">{c}</span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-row gap-2.5 md:flex-col">
          <a href={valuationUrl} className="flex h-11 items-center justify-center rounded-[var(--radius-btn)] bg-accent px-5 text-[14px] font-semibold text-white">
            Free Home Valuation <span className="ml-1.5">↗</span>
          </a>
          {phone ? (
            <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="flex h-11 items-center justify-center rounded-[var(--radius-btn)] border-[1.5px] border-ink bg-white px-5 text-[14px] font-semibold text-ink">
              {callLabel} <span className="ml-1.5">↗</span>
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
