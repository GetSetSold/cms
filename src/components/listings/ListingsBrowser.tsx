import { createMlsClient, type GridListing } from "@/lib/mls";
import { ListingCard } from "@/components/listings/ListingCard";
import { ListingsMap } from "@/components/listings/ListingsMap";
import { Pagination } from "@/components/listings/Pagination";
import { ViewToggle } from "@/components/listings/ViewToggle";
import { PerPageControl } from "@/components/listings/PerPageControl";

export type ListingsSearchParams = { city?: string; type?: string; beds?: string; page?: string; perPage?: string; perRow?: string; view?: string };

export const DEFAULT_CITY = "Cayuga"; // keeps the very first load from ever querying all ~50k rows
const ALL_CITIES_SENTINEL = "all";

const GRID_COLS: Record<number, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
};

/** Renders the full search/grid/split/map listings experience. Reused by
 *  /listings (city from ?city=) and by the listing_grid CMS block and any
 *  future per-city route (city passed in directly, no query param needed). */
export async function ListingsBrowser({
  sp, basePath, fixedCity, heading,
}: {
  sp: ListingsSearchParams;
  basePath: string;
  /** When set (e.g. from a city-page route), the city can't be changed by the visitor. */
  fixedCity?: string;
  heading?: string;
}) {
  const mls = createMlsClient();

  const view = (["grid", "split", "map"].includes(sp.view ?? "") ? sp.view : "grid") as "grid" | "split" | "map";
  const perRow = [2, 3, 4].includes(Number(sp.perRow)) ? Number(sp.perRow) : 4;
  const perPage = [8, 12, 24, 48].includes(Number(sp.perPage)) ? Number(sp.perPage) : 12;
  const page = Math.max(1, Number(sp.page) || 1);
  const from = (page - 1) * perPage;

  const effectiveCity = fixedCity ?? (sp.city === ALL_CITIES_SENTINEL ? null : sp.city || DEFAULT_CITY);
  const cityWasDefaulted = !fixedCity && !sp.city;

  const mapLimit = view === "map" ? Math.max(perPage, 100) : perPage; // map shows a wider set than one grid page, still bounded
  let query = mls.from("grid").select("*", { count: "exact" });
  if (view !== "map") query = query.range(from, from + perPage - 1);
  else query = query.limit(mapLimit);
  if (effectiveCity) query = query.eq("City", effectiveCity);
  if (sp.type === "sale") query = query.not("ListPrice", "is", null);
  if (sp.type === "rent") query = query.is("ListPrice", null).not("TotalActualRent", "is", null);
  if (sp.beds) query = query.gte("BedroomsTotal", Number(sp.beds));
  query = query.order("OriginalEntryTimestamp", { ascending: false });

  const [{ data: listings, count }, { data: cityRows }] = await Promise.all([
    query,
    fixedCity ? Promise.resolve({ data: [] as { City: string }[] }) : mls.from("grid").select("City").not("City", "is", null).limit(2000),
  ]);

  const cities = fixedCity ? [] : [...new Set((cityRows ?? []).map((r) => r.City as string))].sort();
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const rows = (listings ?? []) as GridListing[];

  const hrefFor = (patch: Record<string, string | number | undefined>) => {
    const merged: Record<string, string> = { ...sp } as Record<string, string>;
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === "") delete merged[k];
      else merged[k] = String(v);
    }
    if (!("page" in patch)) delete merged.page; // any filter/view/perPage change resets pagination
    const qs = new URLSearchParams(merged).toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="text-sm text-muted"><a href="/" className="hover:text-ink">Home</a> / {fixedCity ? <><a href="/listings" className="hover:text-ink">Listings</a> / <span>{fixedCity}</span></> : <span>Search</span>}</div>
        <h1 className="font-display text-4xl font-extrabold md:text-5xl">
          {heading ?? (effectiveCity ? `${total.toLocaleString()} listings in ${effectiveCity}` : `${total.toLocaleString()} listings`)}
        </h1>
        {!fixedCity && cityWasDefaulted ? (
          <p className="text-sm text-muted">
            Showing {DEFAULT_CITY} by default. <a href={hrefFor({ city: ALL_CITIES_SENTINEL })} className="font-medium text-primary">Search all cities</a> instead.
          </p>
        ) : (
          <p className="text-muted">{total.toLocaleString()} properties available</p>
        )}
      </div>

      {!fixedCity ? (
        <form className="flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-[0_8px_30px_rgba(20,20,43,0.06)] sm:flex-row sm:items-center" action={basePath}>
          <label className="flex flex-1 items-center gap-2 rounded-xl bg-ground px-3.5 py-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-primary" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input name="city" list="cities" defaultValue={effectiveCity ?? ""} placeholder="Search city or neighbourhood" className="w-full border-0 bg-transparent p-0 text-sm outline-none placeholder:text-muted" />
            <datalist id="cities">{cities.map((c) => <option key={c} value={c} />)}</datalist>
          </label>
          <div className="flex flex-wrap gap-2">
            <select name="type" defaultValue={sp.type ?? ""} className="h-11 rounded-xl border border-line bg-white px-3 text-sm">
              <option value="">Any type</option>
              <option value="sale">For sale</option>
              <option value="rent">For rent</option>
            </select>
            <select name="beds" defaultValue={sp.beds ?? ""} className="h-11 rounded-xl border border-line bg-white px-3 text-sm">
              <option value="">Any beds</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+ beds</option>)}
            </select>
            <button className="btn-primary h-11 px-6">Search</button>
          </div>
        </form>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ViewToggle view={view} hrefFor={(v) => hrefFor({ view: v })} />
        {view !== "map" ? <PerPageControl basePath={basePath} currentParams={sp as Record<string, string>} perRow={perRow} perPage={perPage} /> : null}
      </div>

      {view === "map" ? (
        <div className="h-[70vh] min-h-[480px]">
          <ListingsMap listings={rows} />
        </div>
      ) : view === "split" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className={`grid grid-cols-1 gap-5 ${perRow >= 3 ? "sm:grid-cols-2" : ""}`}>
            {rows.length ? rows.map((l) => <ListingCard key={l.ListingKey} listing={l} />) : (
              <div className="col-span-full rounded-2xl bg-white p-10 text-center text-muted">No listings match your search right now.</div>
            )}
          </div>
          <div className="h-[70vh] min-h-[480px] lg:sticky lg:top-24">
            <ListingsMap listings={rows} />
          </div>
        </div>
      ) : (
        <div className={`grid grid-cols-1 gap-5 ${GRID_COLS[perRow]}`}>
          {rows.length ? rows.map((l) => <ListingCard key={l.ListingKey} listing={l} />) : (
            <div className="col-span-full rounded-2xl bg-white p-10 text-center text-muted">No listings match your search right now.</div>
          )}
        </div>
      )}

      {view !== "map" ? <Pagination page={page} totalPages={totalPages} hrefFor={(p) => hrefFor({ page: p })} /> : null}
    </div>
  );
}
