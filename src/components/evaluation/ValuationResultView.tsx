"use client";

/**
 * Read-only rendering of a completed home valuation — shared by the interactive
 * flow (/free-online-home-valuation result step) and the public share page
 * (/valuation/[id]). Everything the view needs travels in the snapshot, so a
 * saved valuation renders exactly what the homeowner saw, stamped with its
 * data date.
 */

export interface ValuationListing {
  address: string;
  price: number;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  daysOnMarket: number | null;
  distanceKm: number;
  key: string | null;
  image: string | null;
  url: string | null;
}

export interface ValuationHpi {
  label: string;
  covers: string | null;
  change12m: number | null;
  momChange: number | null;
  benchmark: number | null;
  lastUpdated: string;
  propertyType: string;
}

export interface ValuationSnapshot {
  addressLabel: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  propertyType: string;
  condition: string;
  beds: string;
  baths: string;
  sqft: string;
  renovations: string[];
  estimate: { low: number; high: number; mid: number; median: number; count: number } | null;
  listings: ValuationListing[];
  hpi: ValuationHpi | null;
  radiusKm: number;
  rangePct: number;
  /** ISO date (yyyy-mm-dd) the valuation data was captured. */
  dataAsOf: string;
  disclaimer: string;
  bookingUrl: string;
}

export const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-CA");
export const signedPct = (n: number) => `${n > 0 ? "+" : ""}${n}%`;

export function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-3.5 w-3.5"} fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17L17 7M7 7h10v10" />
    </svg>
  );
}

const cardCls =
  "rounded-[var(--radius-lg)] border border-[#E4E4E7] bg-white p-6 shadow-[var(--shadow-card)]";
const btnPrimary =
  "inline-flex h-12 items-center justify-center rounded-[var(--radius-btn)] bg-[#111111] px-6 text-[16px] font-semibold text-white transition hover:brightness-[1.25] disabled:cursor-not-allowed disabled:opacity-40";

const displayDate = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" });
};

export function ValuationResultView({ snapshot: s }: { snapshot: ValuationSnapshot }) {
  const hpi = s.hpi;
  return (
    <>
      <span className="mb-3 inline-block rounded-[var(--radius-btn)] bg-[#e8f1fb] px-3.5 py-1.5 text-[12px] font-bold text-[var(--hev-accent)]">
        Your estimate
      </span>
      <h2 className="text-[30px] font-extrabold tracking-tight text-[#111111]">Preliminary estimate</h2>
      <p className="mt-1.5 text-[15px] text-[#333333]/75">Active listings + market direction + your home's details, combined.</p>

      {s.estimate ? (
        <>
          <div className="mt-7 rounded-[var(--radius-lg)] bg-[#111111] px-6 py-11 text-center text-white sm:px-8">
            <div className="mb-5 px-2 text-[19px] font-bold leading-snug text-white sm:text-[23px]">{s.addressLabel}</div>
            <div className="mb-2.5 text-[12px] font-bold uppercase tracking-[0.14em] text-white/50">Estimated market value</div>
            <div className="text-[36px] font-extrabold tracking-tight sm:text-[44px] md:text-[54px]">
              {fmt(s.estimate.low)} <span className="font-medium text-white/40">–</span> {fmt(s.estimate.high)}
            </div>
            <div className="mt-3 text-[15px] text-white/70">Most likely around <b className="text-white">{fmt(s.estimate.mid)}</b></div>
            <div className="mt-3.5 text-[13px] text-white/45">
              {s.estimate.count} similar homes currently listed within {s.radiusKm} km
              {hpi?.lastUpdated ? ` · HPI benchmark to ${hpi.lastUpdated}` : ""} · Data as of {displayDate(s.dataAsOf)}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className={cardCls}>
              <div className="text-[27px] font-extrabold text-[#111111]">{s.estimate.count}</div>
              <b className="mb-1 mt-2 block text-[14.5px] text-[#111111]">Similar homes listed nearby</b>
              <small className="text-[13px] leading-relaxed text-[#333333]/70">
                What other agents are asking for comparable properties — median <b>{fmt(s.estimate.median)}</b>.
              </small>
            </div>
            <div className={cardCls}>
              <div className="text-[27px] font-extrabold text-[var(--hev-accent)]">
                {hpi?.change12m != null ? signedPct(hpi.change12m) : "—"}
              </div>
              <b className="mb-1 mt-2 block text-[14.5px] text-[#111111]">Market direction (HPI)</b>
              <small className="text-[13px] leading-relaxed text-[#333333]/70">
                {hpi ? (
                  <>{hpi.label} market{hpi.covers ? ` — covers ${hpi.covers}` : ""}: {hpi.propertyType.toLowerCase()} benchmark {hpi.change12m != null && hpi.change12m >= 0 ? "up" : "down"} {hpi.change12m != null ? `${Math.abs(hpi.change12m)}%` : ""} over 12 months.</>
                ) : (
                  "No HPI benchmark available for this area — the estimate uses listings alone."
                )}
              </small>
            </div>
            <div className={cardCls}>
              <div className="text-[27px] font-extrabold text-[#111111]">±{Math.round(((s.estimate.high - s.estimate.low) / 2 / s.estimate.mid) * 100)}%</div>
              <b className="mb-1 mt-2 block text-[14.5px] text-[#111111]">Your home's position</b>
              <small className="text-[13px] leading-relaxed text-[#333333]/70">
                {s.beds} bed / {s.baths} bath{s.sqft ? ` / ${s.sqft} sq ft` : ""}, {s.condition.split(" — ")[0].toLowerCase()} condition
                {s.renovations.length > 0 && s.renovations[0] !== "None" ? `, ${s.renovations.join(", ").toLowerCase()} updated` : ""} — placed within the band. The walkthrough confirms it.
              </small>
            </div>
          </div>

          <h3 className="mb-3.5 mt-10 text-[20px] font-bold text-[#111111]">Similar homes currently listed near you</h3>

          {/* Mobile: stacked compact cards */}
          <div className="grid gap-3 md:hidden">
            {s.listings.map((l, i) => {
              const inner = (
                <>
                  {l.image ? (
                    <img src={l.image} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f7f7f7] text-lg text-[#333333]/40">⌂</span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-extrabold text-[#111111]">{fmt(l.price)}</span>
                    <span className="mt-0.5 block truncate text-[13.5px] font-medium text-[#333333]">{l.address}</span>
                    <span className="mt-0.5 block text-[12.5px] text-[#333333]/65">
                      {l.beds ?? "—"} bd · {l.baths ?? "—"} ba{l.sqft ? ` · ${l.sqft.toLocaleString("en-CA")} sqft` : ""}
                      {l.daysOnMarket != null ? ` · ${l.daysOnMarket}d listed` : ""} · {l.distanceKm} km
                    </span>
                  </span>
                  {l.url ? (
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#111111] text-white">
                      <ArrowIcon className="h-3.5 w-3.5" />
                    </span>
                  ) : null}
                </>
              );
              const cls = "flex items-center gap-3.5 rounded-[var(--radius-lg)] border border-[#E4E4E7] bg-white p-3.5 shadow-[var(--shadow-card)]";
              return l.url ? (
                <a key={i} href={l.url} target="_blank" rel="noreferrer" className={cls}>{inner}</a>
              ) : (
                <div key={i} className={cls}>{inner}</div>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto rounded-[var(--radius-lg)] border border-[#E4E4E7] bg-white shadow-[var(--shadow-card)] md:block">
            <table className="w-full min-w-[820px] border-collapse text-[14px]">
              <thead>
                <tr className="bg-[#f7f7f7] text-left text-[11.5px] font-semibold uppercase tracking-[0.07em] text-[#333333]/60">
                  <th className="px-4 py-3.5" colSpan={2}>Address</th>
                  <th className="px-4 py-3.5">List price</th>
                  <th className="px-4 py-3.5">Beds / Baths</th>
                  <th className="px-4 py-3.5">Sq ft</th>
                  <th className="px-4 py-3.5">Days listed</th>
                  <th className="px-4 py-3.5">Distance</th>
                  <th className="px-4 py-3.5"><span className="sr-only">View</span></th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[#E4E4E7] bg-[#e8f1fb] font-semibold">
                  <td className="px-4 py-3.5" colSpan={2}>Your home</td>
                  <td className="px-4 py-3.5">—</td>
                  <td className="px-4 py-3.5">{s.beds} / {s.baths}</td>
                  <td className="px-4 py-3.5">{s.sqft || "—"}</td>
                  <td className="px-4 py-3.5">—</td>
                  <td className="px-4 py-3.5">—</td>
                  <td className="px-4 py-3.5"></td>
                </tr>
                {s.listings.map((l, i) => (
                  <tr key={i} className="border-t border-[#E4E4E7] align-middle">
                    <td className="py-3 pl-4 pr-1">
                      {l.image ? (
                        <img src={l.image} alt="" loading="lazy"
                          className="h-12 w-12 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f7f7f7] text-lg text-[#333333]/40">⌂</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">{l.address}</td>
                    <td className="px-4 py-3.5 font-semibold">{fmt(l.price)}</td>
                    <td className="px-4 py-3.5">{l.beds ?? "—"} / {l.baths ?? "—"}</td>
                    <td className="px-4 py-3.5">{l.sqft ? l.sqft.toLocaleString("en-CA") : "—"}</td>
                    <td className="px-4 py-3.5">{l.daysOnMarket ?? "—"}</td>
                    <td className="px-4 py-3.5">{l.distanceKm} km</td>
                    <td className="px-4 py-3.5">
                      {l.url ? (
                        <a href={l.url} target="_blank" rel="noreferrer" aria-label={`View listing: ${l.address}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#111111] text-white transition hover:brightness-[1.35]">
                          <ArrowIcon />
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2.5 text-[13px] text-[#333333]/65">
            List prices are asking prices — homes may sell above or below. Days listed hints at how the market is receiving each price.
          </p>
        </>
      ) : (
        <div className="mt-7 rounded-[var(--radius-lg)] border border-[#E4E4E7] bg-white p-10 text-center shadow-[var(--shadow-card)]">
          <h3 className="text-[22px] font-bold text-[#111111]">Not enough nearby listings for an estimate</h3>
          <p className="mx-auto mt-3 max-w-lg text-[15px] text-[#333333]/75">
            We couldn't find enough similar homes currently listed near {s.addressLabel} to build a
            reliable range. This is exactly where an in-person valuation earns its keep.
          </p>
          <a href={s.bookingUrl} target="_blank" rel="noreferrer"
            className={`${btnPrimary} mt-6 px-8 text-[15px]`}>
            Book a free in-person valuation
          </a>
        </div>
      )}

      {/* HPI market detail — makes the benchmark genuine */}
      {hpi && (
        <div className={`${cardCls} mt-6`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <b className="text-[16px] text-[#111111]">HPI benchmark — {hpi.label} market</b>
              {hpi.covers && <p className="mt-1 text-[13px] text-[#333333]/65">Covers {hpi.covers}</p>}
            </div>
            <span className="rounded-[var(--radius-btn)] bg-[#e8f1fb] px-3.5 py-1.5 text-[12px] font-bold text-[var(--hev-accent)]">
              Data to {hpi.lastUpdated}
            </span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              ["Benchmark price", hpi.benchmark != null ? fmt(hpi.benchmark) : "—", `${hpi.propertyType} homes`],
              ["12-month change", hpi.change12m != null ? signedPct(hpi.change12m) : "—", "year over year", hpi.change12m],
              ["Last month", hpi.momChange != null ? signedPct(hpi.momChange) : "—", "month over month", hpi.momChange],
              ["Market read", hpi.change12m != null ? (hpi.change12m >= 0 ? "Rising" : "Softening") : "—", "12-month direction"],
            ].map(([label, value, sub, tone]) => (
              <div key={label as string} className="min-w-0 rounded-[var(--radius-lg)] bg-[#f7f7f7] px-4 py-3.5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#333333]/55">{label}</div>
                <div className={`mt-1 text-[17px] font-extrabold leading-tight sm:text-[20px] ${
                  typeof tone === "number" ? (tone >= 0 ? "text-[var(--hev-accent)]" : "text-[#b3402e]") : "text-[#111111]"
                }`}>{value}</div>
                <div className="text-[12px] text-[#333333]/60">{sub}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[12.5px] leading-relaxed text-[#333333]/60">
            Source: MLS® Home Price Index composite benchmark for {hpi.propertyType.toLowerCase()} homes.
            HPI tracks the value of a typical home — it shows where the market has been heading, not what
            any single property is worth.
          </p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className={cardCls}>
          <b className="text-[15px] text-[#111111]">Market direction</b>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#333333]/75">
            {hpi?.change12m != null
              ? <>The {hpi.label} benchmark for {hpi.propertyType.toLowerCase()} homes is {signedPct(hpi.change12m)} over the last 12 months{hpi.momChange != null ? ` (${signedPct(hpi.momChange)} last month)` : ""} — {hpi.change12m >= 0 ? "a rising market supports the upper half of your range." : "a softening market argues for caution on asking price."}</>
              : "HPI data isn't available for this area yet — your estimate is built from nearby listings alone."}
          </p>
        </div>
        <div className={cardCls}>
          <b className="text-[15px] text-[#111111]">Why a range?</b>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#333333]/75">
            List prices are asking prices, not sold prices — and no estimate has walked through your home.
            Finish quality, layout, lot and upgrades move a property within its band. The in-person
            valuation is where the real number gets set.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-[var(--radius-lg)] border border-[#E4E4E7] bg-[#f7f7f7] px-6 py-5 text-[13px] leading-relaxed text-[#333333]/75">
        <b className="text-[#111111]">Please note:</b> {s.disclaimer}
      </div>
    </>
  );
}
