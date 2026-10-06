"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

const BED_OPTIONS = ["", "1", "2", "3", "4", "5"];
const BATH_OPTIONS = ["", "1", "2", "3", "4"];
const FALLBACK_TYPES = ["House", "Apartment", "Row / Townhouse"];

/** Portal dropdown — renders to body so it never clips inside scroll containers. */
function PortalDropdown({
  anchorRef,
  onClose,
  children,
  width = 256,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const update = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ top: r.bottom + 8 + window.scrollY, left: Math.min(r.left + window.scrollX, window.innerWidth - width - 16) });
    };
    update();
    window.addEventListener("scroll", onClose, { passive: true });
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("scroll", onClose);
      window.removeEventListener("resize", onClose);
    };
  }, [anchorRef, onClose, width]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onClick = (e: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [anchorRef, onClose]);

  if (!pos) return null;
  return createPortal(
    <>
      <style>{`.gss-dd-scroll::-webkit-scrollbar{width:4px}.gss-dd-scroll::-webkit-scrollbar-thumb{background:#d4d4d8;border-radius:4px}.gss-dd-scroll::-webkit-scrollbar-track{background:transparent}.gss-dd-scroll{scrollbar-width:thin;scrollbar-color:#d4d4d8 transparent}`}</style>
      <div
      className="z-[100] rounded-[var(--radius-lg)] border border-line bg-white p-3 shadow-[var(--shadow-card)]"
      style={{ position: "absolute", top: pos.top, left: Math.max(8, pos.left), width }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
      </div>
    </>,
    document.body
  );
}

export function ListingFilters({
  basePath,
  sp,
  showCitySearch,
  cities,
  typeCounts,
}: {
  basePath: string;
  sp: Record<string, string | undefined>;
  showCitySearch?: boolean;
  cities?: string[];
  typeCounts?: Record<string, number>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [minP, setMinP] = useState(sp.minPrice ?? "");
  const [maxP, setMaxP] = useState(sp.maxPrice ?? "");
  const [cityQ, setCityQ] = useState(sp.city ?? "");
  const [cityFilter, setCityFilter] = useState("");
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

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

  const toggle = (id: string) => setOpen(open === id ? null : id);
  const close = () => setOpen(null);

  const activeCount = ["minPrice", "maxPrice", "beds", "baths", "homeType", "type"].filter((k) => sp[k]).length;

  const priceLabel =
    sp.minPrice || sp.maxPrice
      ? `${sp.minPrice ? `$${Number(sp.minPrice).toLocaleString()}` : "$0"} – ${sp.maxPrice ? `$${Number(sp.maxPrice).toLocaleString()}` : "∞"}`
      : "Any Price";

  const pillCls = (active: boolean) =>
    `rounded-[var(--radius-md)] border px-4 py-2 text-sm font-medium transition whitespace-nowrap ${
      active ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-ink"
    }`;

  const setRef = (id: string) => (el: HTMLButtonElement | null) => {
    refs.current[id] = el;
  };

  const cityMatches = (cities ?? []).filter((c) => c.toLowerCase().includes(cityFilter.toLowerCase()));
  // Only cap when searching; empty filter shows the full scrollable list.
  const cityList = cityFilter ? cityMatches.slice(0, 50) : cityMatches;

  return (
    <>
      {/* Desktop pill bar */}
      <div className="gss-dd-scroll hidden items-center gap-2 overflow-x-auto pb-1 md:flex" style={{ scrollbarWidth: "none" }}>
        <div className="flex shrink-0 rounded-[var(--radius-md)] border border-line bg-white p-1">
          <button onClick={() => go({ type: undefined })} className={`rounded-[var(--radius-md)] px-4 py-1.5 text-sm font-medium ${!sp.type ? "bg-ink text-white" : "text-ink"}`}>
            All
          </button>
          <button onClick={() => go({ type: "sale" })} className={`rounded-[var(--radius-md)] px-4 py-1.5 text-sm font-medium ${sp.type === "sale" ? "bg-ink text-white" : "text-ink"}`}>
            For Sale
          </button>
          <button onClick={() => go({ type: "rent" })} className={`rounded-[var(--radius-md)] px-4 py-1.5 text-sm font-medium ${sp.type === "rent" ? "bg-ink text-white" : "text-ink"}`}>
            For Rent
          </button>
        </div>

        {showCitySearch ? (
          <>
            <button ref={setRef("city")} onClick={() => toggle("city")} className={pillCls(!!sp.city && sp.city !== "all")}>
              {sp.city && sp.city !== "all" ? sp.city : "City"} ▾
            </button>
            {open === "city" ? (
              <PortalDropdown anchorRef={{ current: refs.current["city"] }} onClose={close} width={280}>
                <input
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  placeholder="Search cities..."
                  autoFocus
                  className="mb-2 w-full rounded-[var(--radius-md)] border border-line px-3 py-2 text-sm outline-none focus:border-muted"
                />
                <div className="gss-dd-scroll max-h-56 divide-y divide-line/60 overflow-y-auto">
                  <button onClick={() => go({ city: "all" })} className="block w-full px-3 py-2 text-left text-sm hover:bg-ground">
                    All cities
                  </button>
                  {cityList.map((c) => (
                    <button key={c} onClick={() => go({ city: c })} className={`block w-full px-3 py-2 text-left text-sm hover:bg-ground ${sp.city === c ? "bg-ground font-medium" : ""}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </PortalDropdown>
            ) : null}
          </>
        ) : null}

        <button ref={setRef("price")} onClick={() => toggle("price")} className={pillCls(!!(sp.minPrice || sp.maxPrice))}>
          {priceLabel} ▾
        </button>
        {open === "price" ? (
          <PortalDropdown anchorRef={{ current: refs.current["price"] }} onClose={close}>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input value={minP} onChange={(e) => setMinP(e.target.value.replace(/\D/g, ""))} placeholder="Min" inputMode="numeric" className="w-full rounded-[var(--radius-md)] border border-line px-3 py-2 text-sm outline-none focus:border-muted" />
                <input value={maxP} onChange={(e) => setMaxP(e.target.value.replace(/\D/g, ""))} placeholder="Max" inputMode="numeric" className="w-full rounded-[var(--radius-md)] border border-line px-3 py-2 text-sm outline-none focus:border-muted" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => go({ minPrice: minP || undefined, maxPrice: maxP || undefined })} className="flex-1 rounded-[var(--radius-md)] bg-ink py-2 text-sm font-medium text-white">
                  Apply
                </button>
                <button onClick={() => { setMinP(""); setMaxP(""); go({ minPrice: undefined, maxPrice: undefined }); }} className="rounded-[var(--radius-md)] border border-line px-4 py-2 text-sm">
                  Clear
                </button>
              </div>
            </div>
          </PortalDropdown>
        ) : null}

        <button ref={setRef("beds")} onClick={() => toggle("beds")} className={pillCls(!!sp.beds)}>
          {sp.beds ? `${sp.beds}+ Bed` : "Any Beds"} ▾
        </button>
        {open === "beds" ? (
          <PortalDropdown anchorRef={{ current: refs.current["beds"] }} onClose={close} width={220}>
            <div className="flex flex-wrap gap-2">
              {BED_OPTIONS.map((b) => (
                <button key={b || "any"} onClick={() => go({ beds: b || undefined })} className={`rounded-[var(--radius-md)] border px-4 py-1.5 text-sm ${sp.beds === b || (!sp.beds && !b) ? "border-ink bg-ink text-white" : "border-line"}`}>
                  {b ? `${b}+` : "Any"}
                </button>
              ))}
            </div>
          </PortalDropdown>
        ) : null}

        <button ref={setRef("baths")} onClick={() => toggle("baths")} className={pillCls(!!sp.baths)}>
          {sp.baths ? `${sp.baths}+ Bath` : "Any Baths"} ▾
        </button>
        {open === "baths" ? (
          <PortalDropdown anchorRef={{ current: refs.current["baths"] }} onClose={close} width={220}>
            <div className="flex flex-wrap gap-2">
              {BATH_OPTIONS.map((b) => (
                <button key={b || "any"} onClick={() => go({ baths: b || undefined })} className={`rounded-[var(--radius-md)] border px-4 py-1.5 text-sm ${sp.baths === b || (!sp.baths && !b) ? "border-ink bg-ink text-white" : "border-line"}`}>
                  {b ? `${b}+` : "Any"}
                </button>
              ))}
            </div>
          </PortalDropdown>
        ) : null}

        <button ref={setRef("homeType")} onClick={() => toggle("homeType")} className={pillCls(!!sp.homeType)}>
          {sp.homeType || "Home Type"} ▾
        </button>
        {open === "homeType" ? (
          <PortalDropdown anchorRef={{ current: refs.current["homeType"] }} onClose={close} width={280}>
            <div className="gss-dd-scroll max-h-64 divide-y divide-line/60 overflow-y-auto">
              <button onClick={() => go({ homeType: undefined })} className={`px-3 py-2 text-left text-sm ${!sp.homeType ? "bg-ground font-medium" : "hover:bg-ground"}`}>
                Any type
              </button>
              {(typeCounts && Object.keys(typeCounts).length > 0
                ? Object.entries(typeCounts).sort((a, b) => b[1] - a[1])
                : FALLBACK_TYPES.map((t) => [t, 0] as [string, number])
              ).map(([t, c]) => (
                <button key={t} onClick={() => go({ homeType: t })} className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${sp.homeType === t ? "bg-ground font-medium" : "hover:bg-ground"}`}>
                  <span>{t}</span>
                  {c > 0 ? <span className="text-xs text-muted">{c.toLocaleString()}</span> : null}
                </button>
              ))}
            </div>
          </PortalDropdown>
        ) : null}

        {activeCount > 0 ? (
          <button onClick={() => go({ type: undefined, minPrice: undefined, maxPrice: undefined, beds: undefined, baths: undefined, homeType: undefined })} className="shrink-0 rounded-[var(--radius-md)] border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:border-ink whitespace-nowrap">
            Clear all
          </button>
        ) : null}
      </div>

      {/* Mobile filter button */}
      <div className="md:hidden">
        <button onClick={() => setModal(true)} className="flex items-center gap-2 rounded-[var(--radius-md)] border border-line bg-white px-4 py-2.5 text-sm font-medium">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          Filters
          {activeCount > 0 ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[11px] text-white">{activeCount}</span>
          ) : null}
        </button>
      </div>

      {/* Mobile bottom-sheet */}
      {modal ? (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModal(false)} />
          <div className="absolute bottom-4 left-4 right-4 max-h-[85vh] overflow-y-auto rounded-[var(--radius-lg)] bg-white p-5 shadow-[var(--shadow-card)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Filters</h3>
              <button onClick={() => setModal(false)} className="text-2xl leading-none text-muted">×</button>
            </div>
            {showCitySearch ? (
              <div className="mb-5">
                <label className="mb-2 block text-sm font-medium">City</label>
                <input value={cityQ} onChange={(e) => setCityQ(e.target.value)} list="cities-mobile" placeholder="Search city" className="w-full rounded-[var(--radius-md)] border border-line px-3 py-2.5 text-sm outline-none focus:border-muted" />
                <datalist id="cities-mobile">{(cities ?? []).map((c) => <option key={c} value={c} />)}</datalist>
              </div>
            ) : null}
            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium">Listing type</label>
              <div className="flex gap-2">
                {[{ v: undefined, l: "All" }, { v: "sale", l: "For Sale" }, { v: "rent", l: "For Rent" }].map((o) => (
                  <button key={o.l} onClick={() => go({ type: o.v })} className={`flex-1 rounded-[var(--radius-md)] border py-2.5 text-sm font-medium ${sp.type === o.v || (!sp.type && !o.v) ? "border-ink bg-ink text-white" : "border-line"}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium">Price range</label>
              <div className="flex gap-2">
                <input value={minP} onChange={(e) => setMinP(e.target.value.replace(/\D/g, ""))} placeholder="Min price" inputMode="numeric" className="w-full rounded-[var(--radius-md)] border border-line px-3 py-2.5 text-sm outline-none focus:border-ink" />
                <input value={maxP} onChange={(e) => setMaxP(e.target.value.replace(/\D/g, ""))} placeholder="Max price" inputMode="numeric" className="w-full rounded-[var(--radius-md)] border border-line px-3 py-2.5 text-sm outline-none focus:border-ink" />
              </div>
            </div>
            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium">Beds</label>
              <div className="flex flex-wrap gap-2">
                {BED_OPTIONS.map((b) => (
                  <button key={b || "any"} onClick={() => go({ beds: b || undefined })} className={`rounded-[var(--radius-md)] border px-4 py-2 text-sm ${sp.beds === b || (!sp.beds && !b) ? "border-ink bg-ink text-white" : "border-line"}`}>
                    {b ? `${b}+` : "Any"}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium">Baths</label>
              <div className="flex flex-wrap gap-2">
                {BATH_OPTIONS.map((b) => (
                  <button key={b || "any"} onClick={() => go({ baths: b || undefined })} className={`rounded-[var(--radius-md)] border px-4 py-2 text-sm ${sp.baths === b || (!sp.baths && !b) ? "border-ink bg-ink text-white" : "border-line"}`}>
                    {b ? `${b}+` : "Any"}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium">Home type</label>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => go({ homeType: undefined })} className={`rounded-[var(--radius-md)] border px-4 py-2 text-sm ${!sp.homeType ? "border-ink bg-ink text-white" : "border-line"}`}>
                  Any
                </button>
                {(typeCounts && Object.keys(typeCounts).length > 0 ? Object.keys(typeCounts).sort((a, b) => (typeCounts[b] ?? 0) - (typeCounts[a] ?? 0)) : FALLBACK_TYPES).map((t) => (
                  <button key={t} onClick={() => go({ homeType: t })} className={`rounded-[var(--radius-md)] border px-4 py-2 text-sm ${sp.homeType === t ? "border-ink bg-ink text-white" : "border-line"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => go({ minPrice: minP || undefined, maxPrice: maxP || undefined, city: cityQ || undefined })} className="flex-1 rounded-[var(--radius-md)] bg-ink py-3 text-sm font-semibold text-white">
                Show results
              </button>
              <button onClick={() => { setMinP(""); setMaxP(""); go({ type: undefined, minPrice: undefined, maxPrice: undefined, beds: undefined, baths: undefined, homeType: undefined }); }} className="rounded-[var(--radius-md)] border border-line px-5 py-3 text-sm font-medium">
                Clear
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
