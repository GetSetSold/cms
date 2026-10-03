import type { CityStats } from "@/lib/cityStats";
import { formatPrice } from "@/lib/cityStats";

/** Zolo-style market stat cards, computed live from the MLS grid. */
export function CityStatsSection({ stats }: { stats: CityStats }) {
  const cards = [
    { label: "Active listings", value: stats.activeCount.toLocaleString() },
    { label: "Median list price", value: formatPrice(stats.medianSalePrice) },
    { label: "Median rent", value: stats.medianLeasePrice ? `${formatPrice(stats.medianLeasePrice)}/mo` : "—" },
    { label: "For sale", value: stats.saleCount.toLocaleString() },
    { label: "For rent", value: stats.leaseCount.toLocaleString() },
  ];
  return (
    <section className="mt-12">
      <h2 className="mb-5 font-display text-2xl">Market stats in {stats.city}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-white p-5">
            <div className="font-display text-2xl font-semibold">{c.value}</div>
            <div className="mt-1 text-sm text-muted">{c.label}</div>
          </div>
        ))}
      </div>
      {stats.typeBreakdown.length > 1 ? (
        <div className="mt-4 rounded-2xl bg-white p-6">
          <h3 className="mb-3 font-display text-lg">Property types in {stats.city}</h3>
          <div className="flex flex-wrap gap-2">
            {stats.typeBreakdown.map((t) => (
              <span key={t.label} className="rounded-full bg-ground px-3 py-1.5 text-sm">
                {t.label}: <strong>{t.count}</strong>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
