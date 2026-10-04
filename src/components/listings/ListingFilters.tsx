"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type FilterParams = {
  type?: string;
  minPrice?: string;
  maxPrice?: string;
  beds?: string;
  baths?: string;
  homeType?: string;
};

const BED_OPTIONS = ["", "1", "2", "3", "4", "5"];
const BATH_OPTIONS = ["", "1", "2", "3", "4"];
const HOME_TYPES = [
  { value: "", label: "Any type" },
  { value: "house", label: "House" },
  { value: "condo", label: "Condo" },
  { value: "townhouse", label: "Townhouse" },
];

function pillLabel(value: string | undefined, prefix: string, suffix: string, anyLabel: string) {
  if (!value) return anyLabel;
  return `${prefix}${value}${suffix}`;
}

/** Modern Zolo-style filter bar: pills on desktop, bottom-sheet modal on
 *  mobile. Every change rebuilds the URL (?minPrice=&beds=…) so filters are
 *  shareable and removed cleanly. Works on /listings, city hubs and
 *  neighbourhood pages via basePath. */
export function ListingFilters({
  basePath,
  sp,
  showCitySearch,
  cities,
}: {
  basePath: string;
  sp: Record<string, string | undefined>;
  showCitySearch?: boolean;
  cities?: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [minP, setMinP] = useState(sp.minPrice ?? "");
  const [maxP, setMaxP] = useState(sp.maxPrice ?? "");
  const [cityQ, setCityQ] = useState(sp.city ?? "");

  const buildUrl = (patch: Record<string, string | undefined>) => {
    const merged: Record<string, string> = {};
    for (const [k, v] of Object.entries(sp)) if (v) merged[k] = v;
    for (const [k, v] of Object.entries(patch)) {
      if (!v) delete merged[k];
      else merged[k] = v;
    }
    delete merged.page;
    const qs = new URLSearchParams(merged).toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };

  const go = (patch: Record<string, string | undefined>) => {
    router.push(buildUrl(patch));
    setOpen(null);
    setModal(false);
  };

  const activeCount = ["minPrice", "maxPrice", "beds", "baths", "homeType", "type"].filter(
    (k) => sp[k]
  ).length;

  const priceLabel =
    sp.minPrice || sp.maxPrice
      ? `${sp.minPrice ? `$${Number(sp.minPrice).toLocaleString()}` : "$0"} – ${
          sp.maxPrice ? `$${Number(sp.maxPrice).toLocaleString()}` : "∞"
        }`
      : "Any Price";

  const pillCls = (active: boolean) =>
    `rounded-full border px-4 py-2 text-sm font-medium transition ${
      active
        ? "border-ink bg-ink text-white"
        : "border-line bg-white text-ink hover:border-ink"
    }`;

  const dropdown = (id: string, content: React.ReactNode) =>
    open === id ? (
      <div className="absolute left-0 top-full z-30 mt-2 w-64 rounded-2xl border border-line bg-white p-4 shadow-xl">
        {content}
      </div>
    ) : null;

  return (
    <>
      {/* Desktop pill bar */}
      <div className="hidden flex-wrap items-center gap-2 md:flex">
        <div className="flex rounded-full border border-line bg-white p-1">
          <button
            onClick={() => go({ type: undefined })}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${!sp.type ? "bg-ink text-white" : "text-ink"}`}
          >
            All
          </button>
          <button
            onClick={() => go({ type: "sale" })}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${sp.type === "sale" ? "bg-ink text-white" : "text-ink"}`}
          >
            For Sale
          </button>
          <button
            onClick={() => go({ type: "rent" })}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${sp.type === "rent" ? "bg-ink text-white" : "text-ink"}`}
          >
            For Rent
          </button>
        </div>

        <div className="relative">
          <button onClick={() => setOpen(open === "price" ? null : "price")} className={pillCls(!!(sp.minPrice || sp.maxPrice))}>
            {priceLabel} ▾
          </button>
          {dropdown(
            "price",
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  value={minP}
                  onChange={(e) => setMinP(e.target.value.replace(/\D/g, ""))}
                  placeholder="Min"
                  inputMode="numeric"
                  className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-ink"
                />
                <input
                  value={maxP}
                  onChange={(e) => setMaxP(e.target.value.replace(/\D/g, ""))}
                  placeholder="Max"
                  inputMode="numeric"
                  className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-ink"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => go({ minPrice: minP || undefined, maxPrice: maxP || undefined })} className="flex-1 rounded-xl bg-ink py-2 text-sm font-medium text-white">
                  Apply
                </button>
                <button
                  onClick={() => {
                    setMinP("");
                    setMaxP("");
                    go({ minPrice: undefined, maxPrice: undefined });
                  }}
                  className="rounded-xl border border-line px-4 py-2 text-sm"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button onClick={() => setOpen(open === "beds" ? null : "beds")} className={pillCls(!!sp.beds)}>
            {pillLabel(sp.beds, "", "+ Bed", "Any Beds")} ▾
          </button>
          {dropdown(
            "beds",
            <div className="flex flex-wrap gap-2">
              {BED_OPTIONS.map((b) => (
                <button
                  key={b || "any"}
                  onClick={() => go({ beds: b || undefined })}
                  className={`rounded-full border px-4 py-1.5 text-sm ${sp.beds === b || (!sp.beds && !b) ? "border-ink bg-ink text-white" : "border-line"}`}
                >
                  {b ? `${b}+` : "Any"}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button onClick={() => setOpen(open === "baths" ? null : "baths")} className={pillCls(!!sp.baths)}>
            {pillLabel(sp.baths, "", "+ Bath", "Any Baths")} ▾
          </button>
          {dropdown(
            "baths",
            <div className="flex flex-wrap gap-2">
              {BATH_OPTIONS.map((b) => (
                <button
                  key={b || "any"}
                  onClick={() => go({ baths: b || undefined })}
                  className={`rounded-full border px-4 py-1.5 text-sm ${sp.baths === b || (!sp.baths && !b) ? "border-ink bg-ink text-white" : "border-line"}`}
                >
                  {b ? `${b}+` : "Any"}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button onClick={() => setOpen(open === "homeType" ? null : "homeType")} className={pillCls(!!sp.homeType)}>
            {HOME_TYPES.find((h) => h.value === (sp.homeType ?? ""))?.label ?? "Home Type"} ▾
          </button>
          {dropdown(
            "homeType",
            <div className="flex flex-col gap-1">
              {HOME_TYPES.map((h) => (
                <button
                  key={h.value}
                  onClick={() => go({ homeType: h.value || undefined })}
                  className={`rounded-xl px-3 py-2 text-left text-sm ${sp.homeType === h.value || (!sp.homeType && !h.value) ? "bg-ground font-medium" : "hover:bg-ground"}`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {activeCount > 0 ? (
          <button
            onClick={() => go({ type: undefined, minPrice: undefined, maxPrice: undefined, beds: undefined, baths: undefined, homeType: undefined })}
            className="text-sm font-medium text-muted underline hover:text-ink"
          >
            Clear all
          </button>
        ) : null}
      </div>

      {/* Mobile: filter button */}
      <div className="md:hidden">
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-medium"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M7 12h10M10 18h4" />
            <circle cx="9" cy="6" r="2" fill="white" />
            <circle cx="15" cy="12" r="2" fill="white" />
            <circle cx="13" cy="18" r="2" fill="white" />
          </svg>
          Filters
          {activeCount > 0 ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[11px] text-white">
              {activeCount}
            </span>
          ) : null}
        </button>
      </div>

      {/* Mobile bottom-sheet modal */}
      {modal ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModal(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Filters</h3>
              <button onClick={() => setModal(false)} className="text-2xl leading-none text-muted">×</button>
            </div>

            {showCitySearch ? (
              <div className="mb-5">
                <label className="mb-2 block text-sm font-medium">City</label>
                <input
                  value={cityQ}
                  onChange={(e) => setCityQ(e.target.value)}
                  list="cities-mobile"
                  placeholder="Search city"
                  className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-ink"
                />
                <datalist id="cities-mobile">{(cities ?? []).map((c) => <option key={c} value={c} />)}</datalist>
              </div>
            ) : null}

            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium">Listing type</label>
              <div className="flex gap-2">
                {[
                  { v: undefined, l: "All" },
                  { v: "sale", l: "For Sale" },
                  { v: "rent", l: "For Rent" },
                ].map((o) => (
                  <button
                    key={o.l}
                    onClick={() => go({ type: o.v })}
                    className={`flex-1 rounded-xl border py-2.5 text-sm font-medium ${sp.type === o.v || (!sp.type && !o.v) ? "border-ink bg-ink text-white" : "border-line"}`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium">Price range</label>
              <div className="flex gap-2">
                <input
                  value={minP}
                  onChange={(e) => setMinP(e.target.value.replace(/\D/g, ""))}
                  placeholder="Min price"
                  inputMode="numeric"
                  className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-ink"
                />
                <input
                  value={maxP}
                  onChange={(e) => setMaxP(e.target.value.replace(/\D/g, ""))}
                  placeholder="Max price"
                  inputMode="numeric"
                  className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-ink"
                />
              </div>
            </div>

            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium">Beds</label>
              <div className="flex flex-wrap gap-2">
                {BED_OPTIONS.map((b) => (
                  <button
                    key={b || "any"}
                    onClick={() => go({ beds: b || undefined })}
                    className={`rounded-full border px-4 py-2 text-sm ${sp.beds === b || (!sp.beds && !b) ? "border-ink bg-ink text-white" : "border-line"}`}
                  >
                    {b ? `${b}+` : "Any"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium">Baths</label>
              <div className="flex flex-wrap gap-2">
                {BATH_OPTIONS.map((b) => (
                  <button
                    key={b || "any"}
                    onClick={() => go({ baths: b || undefined })}
                    className={`rounded-full border px-4 py-2 text-sm ${sp.baths === b || (!sp.baths && !b) ? "border-ink bg-ink text-white" : "border-line"}`}
                  >
                    {b ? `${b}+` : "Any"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium">Home type</label>
              <div className="flex flex-wrap gap-2">
                {HOME_TYPES.map((h) => (
                  <button
                    key={h.value}
                    onClick={() => go({ homeType: h.value || undefined })}
                    className={`rounded-full border px-4 py-2 text-sm ${sp.homeType === h.value || (!sp.homeType && !h.value) ? "border-ink bg-ink text-white" : "border-line"}`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => go({ minPrice: minP || undefined, maxPrice: maxP || undefined, city: cityQ || undefined })}
                className="flex-1 rounded-xl bg-ink py-3 text-sm font-semibold text-white"
              >
                Show results
              </button>
              <button
                onClick={() => {
                  setMinP("");
                  setMaxP("");
                  go({ type: undefined, minPrice: undefined, maxPrice: undefined, beds: undefined, baths: undefined, homeType: undefined });
                }}
                className="rounded-xl border border-line px-5 py-3 text-sm font-medium"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
