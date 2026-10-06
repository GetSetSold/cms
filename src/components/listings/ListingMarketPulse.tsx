import Link from "next/link";
import { getHpiMarket, hpiMarketForCity, fmtMoney, fmtPct, pctTone } from "@/lib/hpi";
import { HpiChart } from "../hpi/HpiChart";

/**
 * Market pulse for the listing detail page — price card + two mini charts
 * (Year over year, Past 10 years) with thin dividers, stacking on mobile.
 */
export async function ListingMarketPulse({ citySlug, cityName }: { citySlug: string; cityName: string }) {
  const hpiSlug = hpiMarketForCity(citySlug);
  if (!hpiSlug) return null;
  const market = await getHpiMarket(hpiSlug);
  if (!market) return null;

  const yoy = market.latest.yoyChange;
  const tone = pctTone(yoy);

  const yoyPoints = market.history12m.map((h) => ({ month: h.month, value: h.compositeBenchmark, hpi: h.compositeHPI }));
  const byYear = new Map<string, { month: string; value: number }>();
  for (const h of market.fullHistory) {
    const y = h.month.slice(0, 4);
    byYear.set(y, { month: `${y}-12`, value: h.compositeBenchmark });
  }
  const tenYr = [...byYear.entries()].sort().slice(-10).map(([, v]) => ({ month: v.month, value: v.value }));

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] bg-white">
      {/* Price header */}
      <div className="flex items-center justify-between gap-4 p-6">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-wide text-muted">
            {market.name} market
          </div>
          <div className="mt-1 flex items-baseline gap-2.5">
            <span className="font-display text-2xl font-bold tracking-tight">
              {fmtMoney(market.latest.compositeBenchmark)}
            </span>
            <span className={`text-[15px] font-semibold ${tone === "neg" ? "text-red-700" : tone === "pos" ? "text-green-700" : "text-muted"}`}>
              {fmtPct(yoy)} YoY
            </span>
          </div>
          <p className="mt-1 text-[12px] text-muted">
            Benchmark price · Updated {market.lastUpdated}
          </p>
        </div>
        <Link
          href={`/ontario-housing-market-trends/${hpiSlug}`}
          className="group inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-md)] bg-ink px-4 py-2.5 text-[13px] font-bold text-white"
        >
          Trends
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
        </Link>
      </div>

      {/* Mini charts with thin dividers, stacked on mobile */}
      <div className="grid grid-cols-1 divide-y divide-line border-t border-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div className="p-5">
          <h3 className="mb-2 text-center text-[13px] font-semibold">Year over year</h3>
          <HpiChart points={yoyPoints} height={160} />
        </div>
        <div className="p-5">
          <h3 className="mb-2 text-center text-[13px] font-semibold">Past 10 years</h3>
          <HpiChart points={tenYr} height={160} />
        </div>
      </div>
    </div>
  );
}
