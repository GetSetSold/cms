"use client";

/**
 * Shared "similar homes currently listed" block — used by both the seller
 * result view and the buyer result view. Mobile: stacked compact cards.
 * Desktop: comparison table with a "Your home" reference row.
 */

import type { ValuationListing } from "./ValuationResultView";
import { fmt, ArrowIcon } from "./ValuationResultView";

export function ValuationListings({
  listings,
  home,
}: {
  listings: ValuationListing[];
  home: { beds: string; baths: string; sqft: string };
}) {
  return (
    <>
      <h3 className="mb-3.5 mt-10 text-[20px] font-bold text-[#111111]">Similar homes currently listed near you</h3>

      {/* Mobile: stacked compact cards */}
      <div className="grid gap-3 md:hidden">
        {listings.map((l, i) => {
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
              <td className="px-4 py-3.5">{home.beds} / {home.baths}</td>
              <td className="px-4 py-3.5">{home.sqft || "—"}</td>
              <td className="px-4 py-3.5">—</td>
              <td className="px-4 py-3.5">—</td>
              <td className="px-4 py-3.5"></td>
            </tr>
            {listings.map((l, i) => (
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
  );
}
