import Link from "next/link";
import { getHpiMarket, hpiMarketForCity, fmtMoney, fmtPct, pctTone } from "@/lib/hpi";

/**
 * Compact market pulse for the listing detail page.
 * Shows the city HPI benchmark + YoY change, linking to the full trends page.
 */
export async function ListingMarketPulse({ citySlug, cityName }: { citySlug: string; cityName: string }) {
  const hpiSlug = hpiMarketForCity(citySlug);
  if (!hpiSlug) return null;
  const market = await getHpiMarket(hpiSlug);
  if (!market) return null;

  const yoy = market.latest.yoyChange;
  const tone = pctTone(yoy);

  return (
    <div className="rounded-2xl bg-white p-6">
      <div className="flex items-center justify-between gap-4">
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
          className="group inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-ink px-4 py-2.5 text-[13px] font-bold text-white"
        >
          Trends
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
