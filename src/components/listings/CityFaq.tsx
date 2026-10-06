import type { CityStats } from "@/lib/cityStats";
import { formatPrice } from "@/lib/cityStats";

/** FAQ block with FAQPage JSON-LD (featured-snippet bait, per Zolo's playbook). */
export function CityFaq({ stats }: { stats: CityStats }) {
  const { city } = stats;
  const faqs = [
    {
      q: `How many homes are listed in ${city}?`,
      a: `There are currently ${stats.activeCount.toLocaleString()} active MLS® listings in ${city}, including ${stats.saleCount.toLocaleString()} homes for sale${stats.leaseCount > 0 ? ` and ${stats.leaseCount.toLocaleString()} properties for rent` : ""}. Listings update daily from the live MLS® feed.`,
    },
    {
      q: `What is the median home price in ${city}?`,
      a: stats.medianSalePrice
        ? `The median list price for homes in ${city} is ${formatPrice(stats.medianSalePrice)}, based on currently active MLS® listings.`
        : `Home prices in ${city} vary by property type and neighbourhood — browse the live listings above for current asking prices.`,
    },
    ...(stats.medianLeasePrice
      ? [
          {
            q: `What is the median rent in ${city}?`,
            a: `The median asking rent in ${city} is currently ${formatPrice(stats.medianLeasePrice)} per month, based on active rental listings.`,
          },
        ]
      : []),
    {
      q: `What types of properties are available in ${city}?`,
      a:
        stats.typeBreakdown.length > 0
          ? `The ${city} market offers ${stats.typeBreakdown.map((t) => `${t.count} ${t.label.toLowerCase()}${t.count === 1 ? "" : "s"}`).join(", ")}.`
          : `Browse the listings above to see the property types currently available in ${city}.`,
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section className="mt-12">
      <h2 className="mb-5 font-display text-2xl">FAQs about {city} real estate</h2>
      <div className="flex flex-col gap-4">
        {faqs.map((f) => (
          <div key={f.q} className="rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line bg-white p-6 shadow-[var(--shadow-card)]">
            <h3 className="font-display text-lg">{f.q}</h3>
            <p className="mt-2 leading-relaxed text-muted">{f.a}</p>
          </div>
        ))}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </section>
  );
}
