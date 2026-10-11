"use client";

/**
 * Buyer-mode result view for the home valuation flow ("What will it sell for?").
 * Same data as the seller view, reframed: the HPI benchmark is the "sold"
 * proxy, live active listings are the "asking" side, and their ratio turns any
 * asking price into an estimated sale price.
 */

import { useState } from "react";
import type { ValuationSnapshot } from "./ValuationResultView";
import { fmt } from "./ValuationResultView";
import { ValuationListings } from "./ValuationListings";

const cardCls =
  "rounded-[var(--radius-lg)] border border-[#E4E4E7] bg-white p-6 shadow-[var(--shadow-card)]";
const btnPrimary =
  "inline-flex h-12 items-center justify-center rounded-[var(--radius-btn)] bg-[#111111] px-6 text-[16px] font-semibold text-white transition hover:brightness-[1.25] disabled:cursor-not-allowed disabled:opacity-40";

const parseNum = (v: string) => {
  const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
  return isFinite(n) && n > 0 ? n : null;
};

export function BuyerResultView({
  snapshot: s,
  bookingUrl,
}: {
  snapshot: ValuationSnapshot;
  bookingUrl: string;
}) {
  const hpi = s.hpi;
  const median = s.estimate?.median ?? null;
  const benchmark = hpi?.benchmark ?? null;
  const ratio = median && benchmark && median > 0 && benchmark > 0 ? benchmark / median : null;

  const [askStr, setAskStr] = useState(median != null ? fmt(median) : "");
  const asking = parseNum(askStr) ?? median ?? 0;
  const saleEst = ratio && asking > 0 ? asking * ratio : null;
  const pct = ratio != null ? ratio * 100 : null;
  const underAsking = median != null && benchmark != null ? median - benchmark : null;

  const doms = s.listings.map((l) => l.daysOnMarket).filter((d): d is number => d != null);
  const avgDom = doms.length > 0 ? Math.round(doms.reduce((a, b) => a + b, 0) / doms.length) : null;

  const typeLabel = s.propertyType ? s.propertyType.toLowerCase() : "detached";
  const areaLabel = `${s.propertyType || "Detached"} homes${s.city ? ` · ${s.city} area` : ""}`;

  if (!s.estimate || ratio == null) {
    return (
      <div className="mt-7 rounded-[var(--radius-lg)] border border-[#E4E4E7] bg-white p-10 text-center shadow-[var(--shadow-card)]">
        <h3 className="text-[22px] font-bold text-[#111111]">Not enough nearby listings for a price check</h3>
        <p className="mx-auto mt-3 max-w-lg text-[15px] text-[#333333]/75">
          We couldn't find enough similar homes currently listed near {s.addressLabel} to build a
          reliable read. This is exactly where a buyer consultation earns its keep.
        </p>
        <a href={bookingUrl} target="_blank" rel="noreferrer" className={`${btnPrimary} mt-6 px-8 text-[15px]`}>
          Book a buyer consultation
        </a>
      </div>
    );
  }

  return (
    <>
      <span className="mb-3 inline-block rounded-[var(--radius-btn)] bg-[#e8f1fb] px-3.5 py-1.5 text-[12px] font-bold text-[var(--hev-accent)]">
        For buyers
      </span>
      <h2 className="text-[30px] font-extrabold tracking-tight text-[#111111]">What will it actually sell for?</h2>
      <p className="mt-1.5 text-[15px] text-[#333333]/75">
        Asking prices are wishes. The HPI benchmark shows what {typeLabel} homes here really transact at.
      </p>

      <div className="mt-7 rounded-[var(--radius-lg)] bg-[#111111] px-6 py-11 text-center text-white sm:px-8">
        <div className="mb-5 px-2 text-[19px] font-bold leading-snug text-white sm:text-[23px]">{areaLabel}</div>
        <div className="mb-2.5 text-[12px] font-bold uppercase tracking-[0.14em] text-white/50">Estimated sale price</div>
        <div className="text-[36px] font-extrabold tracking-tight sm:text-[44px] md:text-[54px]">
          {saleEst != null ? fmt(saleEst) : "—"}
        </div>
        <div className="mt-3 text-[15px] text-white/70">
          based on a list price of <b className="text-white">{asking > 0 ? fmt(asking) : "—"}</b>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <label htmlFor="buyer-ask" className="text-[12px] font-bold uppercase tracking-[0.1em] text-white/55">
            Try a list price
          </label>
          <input
            id="buyer-ask"
            type="text"
            inputMode="numeric"
            value={askStr}
            onChange={(e) => setAskStr(e.target.value)}
            onBlur={() => { const n = parseNum(askStr); setAskStr(n != null ? fmt(n) : askStr); }}
            onFocus={(e) => e.target.select()}
            aria-label="Try a list price"
            className="h-12 w-44 rounded-[var(--radius-btn)] border-0 bg-white px-5 text-center text-[17px] font-extrabold text-[#111111] outline-none"
          />
        </div>
        <div className="mt-4 text-[13px] text-white/45">
          Sold proxy: HPI benchmark {benchmark != null ? fmt(benchmark) : "—"} · Asking side: {s.estimate.count} live listings, median {median != null ? fmt(median) : "—"} · Data as of {s.dataAsOf}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className={cardCls}>
          <div className="text-[27px] font-extrabold text-[var(--hev-accent)]">
            {pct != null ? `${pct.toFixed(1)}%` : "—"}
          </div>
          <b className="mb-1 mt-2 block text-[14.5px] text-[#111111]">Sale price vs asking</b>
          <small className="text-[13px] leading-relaxed text-[#333333]/70">
            Homes like this transact at about <b>{pct != null ? `${pct.toFixed(1)}%` : "—"} of asking</b>
            {underAsking != null && underAsking > 0 ? (
              <> — roughly <b>{fmt(underAsking)}</b> under the median list price.</>
            ) : (
              <>.</>
            )}
          </small>
          {pct != null && (
            <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-[#E4E4E7]">
              <div className="h-full rounded-full bg-[var(--hev-accent)]" style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
          )}
        </div>
        <div className={cardCls}>
          <div className="text-[27px] font-extrabold text-[#111111]">
            {benchmark != null ? fmt(benchmark) : "—"}
          </div>
          <b className="mb-1 mt-2 block text-[14.5px] text-[#111111]">HPI benchmark — the &ldquo;sold&rdquo; side</b>
          <small className="text-[13px] leading-relaxed text-[#333333]/70">
            What {typeLabel} homes in this market actually transact at, per the MLS&reg; Home Price Index
            {hpi?.lastUpdated ? ` (data to ${hpi.lastUpdated})` : ""}.
          </small>
        </div>
        <div className={cardCls}>
          <div className="text-[27px] font-extrabold text-[#111111]">
            {avgDom != null ? `${avgDom} days` : "—"}
          </div>
          <b className="mb-1 mt-2 block text-[14.5px] text-[#111111]">Market speed</b>
          <small className="text-[13px] leading-relaxed text-[#333333]/70">
            {avgDom != null ? (
              <>Similar homes averaging {avgDom} days listed — time to negotiate, not to panic.</>
            ) : (
              <>Not enough days-on-market data for a speed read.</>
            )}
          </small>
        </div>
      </div>

      <details className="mt-6 overflow-hidden rounded-[var(--radius-lg)] border border-[#E4E4E7] bg-white shadow-[var(--shadow-card)]">
        <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-[18px] text-[15px] font-bold text-[#111111] [&::-webkit-details-marker]:hidden">
          How this is calculated <span className="text-[var(--hev-accent)]">▾</span>
        </summary>
        <div className="px-6 pb-[22px] text-[13.5px] leading-[1.65] text-[#333333]/78">
          <b className="text-[#111111]">Sold side:</b> the HPI benchmark for {typeLabel} homes in this market
          {benchmark != null ? ` (${fmt(benchmark)})` : ""} — the index tracks what typical homes transact at, not asking prices.<br />
          <b className="text-[#111111]">Asking side:</b> the median list price of {s.estimate.count} similar homes
          currently listed near the address{median != null ? ` (${fmt(median)})` : ""}.<br />
          <b className="text-[#111111]">The ratio:</b> {pct != null ? `${pct.toFixed(1)}%` : "—"}. Enter any asking price
          above and the estimate scales by that ratio.<br />
          This is a market-level read, not a price opinion on one specific property — the in-person
          walkthrough is still where the real number gets set.
        </div>
      </details>

      <ValuationListings listings={s.listings} home={{ beds: s.beds, baths: s.baths, sqft: s.sqft }} />
    </>
  );
}
