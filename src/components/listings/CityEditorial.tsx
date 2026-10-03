import type { CityStats } from "@/lib/cityStats";
import { formatPrice } from "@/lib/cityStats";

/** Template editorial content for city hubs, interpolated with live stats.
 *  Gives each hub unique, substantive copy (a Zolo ranking factor). */
export function CityEditorial({ stats }: { stats: CityStats }) {
  const { city } = stats;
  const topType = stats.typeBreakdown[0]?.label.toLowerCase() ?? "homes";
  return (
    <section className="mt-12 rounded-2xl bg-white p-6 md:p-8">
      <h2 className="mb-4 font-display text-2xl">About {city} real estate</h2>
      <div className="flex flex-col gap-4 leading-relaxed text-muted">
        <p>
          {city} currently has {stats.activeCount.toLocaleString()} active MLS® listings on GetSetSold.ca
          {stats.medianSalePrice ? `, with a median list price of ${formatPrice(stats.medianSalePrice)}` : ""}
          . The market is dominated by {topType}, and new listings are added daily
          from the live MLS® feed, so what you see here is always current.
        </p>
        <p>
          Whether you&apos;re buying your first home, upsizing, or looking for an investment property,
          browsing live {city} listings is the best way to understand what your budget buys right now.
          {stats.leaseCount > 0
            ? ` Prefer to rent? There are also ${stats.leaseCount.toLocaleString()} rental listings available in ${city}.`
            : ""}
          {" "}For a personalized take on the {city} market — pricing trends, neighbourhood trade-offs,
          and upcoming listings — talk to a local REALTOR® who works these streets every day.
        </p>
      </div>
    </section>
  );
}
