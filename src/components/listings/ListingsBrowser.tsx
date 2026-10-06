import { createMlsClient, listNormalizedCities, rawCitiesFor, resolveCityName, type GridListing } from "@/lib/mls";
import { listingCardsWithAds } from "@/components/listings/ListingGrid";
import { getSettings } from "@/lib/cms";
import { ListingsMap } from "@/components/listings/ListingsMap";
import { Pagination } from "@/components/listings/Pagination";
import { ViewToggle } from "@/components/listings/ViewToggle";
import { ListingFilters } from "@/components/listings/ListingFilters";

export type ListingsSearchParams = { city?: string; type?: string; beds?: string; baths?: string; homeType?: string; minPrice?: string; maxPrice?: string; lat?: string; lng?: string; page?: string; perPage?: string; perRow?: string; view?: string };

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
// Module-level cache for home-type counts (1h TTL) — avoids a 10k-row scan on every page load.
const typeCountsCache = new Map<string, { data: Record<string, number>; ts: number }>();
const TYPE_CACHE_TTL = 3600000;

async function getCachedTypeCounts(
  mls: ReturnType<typeof createMlsClient>,
  cityVariants: string[]
): Promise<Record<string, number>> {
  const key = [...cityVariants].sort().join("|");
  const cached = typeCountsCache.get(key);
  if (cached && Date.now() - cached.ts < TYPE_CACHE_TTL) return cached.data;
  const { data } = await mls.from("grid").select("StructureTypeText").in("City", cityVariants).limit(10000);
  const counts: Record<string, number> = {};
  for (const r of (data ?? []) as { StructureTypeText: string | null }[]) {
    const t = r.StructureTypeText?.trim() || "Other";
    counts[t] = (counts[t] || 0) + 1;
  }
  typeCountsCache.set(key, { data: counts, ts: Date.now() });
  return counts;
}

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
  const perRow = 4;
  // Fetch settings first: if the ad card shows, use 11 listings so 11 + 1 ad = 12 cards
  const _settings = await getSettings();
  const _ads = (_settings as { ads?: import("./ListingGrid").AdConfig } | null)?.ads;
  const _showAd = !!(_ads?.grid_ad_enabled && _ads?.grid_ad_code?.includes("data-ad-client"));
  const perPage = _showAd && view !== "map" ? 11 : 12;
  const page = Math.max(1, Number(sp.page) || 1);
  const from = (page - 1) * perPage;

  const hasLocation = !fixedCity && sp.lat && sp.lng && !isNaN(Number(sp.lat)) && !isNaN(Number(sp.lng));
  const effectiveCity = fixedCity ?? (hasLocation ? null : sp.city === ALL_CITIES_SENTINEL ? null : sp.city || DEFAULT_CITY);
  const cityWasDefaulted = !fixedCity && !sp.city && !hasLocation;

  // Normalized cities expand to all raw variants ("Toronto" -> "Toronto",
  // "Toronto (Mimico)", ...). Search-box input is resolved the same way.
  let cityVariants: string[] | null = null;
  if (fixedCity) {
    cityVariants = await rawCitiesFor(fixedCity);
  } else if (!hasLocation && sp.city && sp.city !== ALL_CITIES_SENTINEL) {
    const normalized = await resolveCityName(sp.city);
    if (normalized) cityVariants = await rawCitiesFor(normalized);
  }

  const mapLimit = view === "map" ? Math.max(perPage, 100) : perPage; // map shows a wider set than one grid page, still bounded
  let query = mls.from("grid").select("*", { count: "exact" });
  if (view !== "map") query = query.range(from, from + perPage - 1);
  else query = query.limit(mapLimit);
  if (hasLocation) {
    const lat = Number(sp.lat), lng = Number(sp.lng);
    const radiusKm = 10;
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
    query = query
      .gte("Latitude", lat - latDelta)
      .lte("Latitude", lat + latDelta)
      .gte("Longitude", lng - lngDelta)
      .lte("Longitude", lng + lngDelta);
  } else if (cityVariants) query = query.in("City", cityVariants);
  else if (effectiveCity) query = query.eq("City", effectiveCity);
  if (sp.type === "sale") query = query.not("ListPrice", "is", null);
  if (sp.type === "rent") query = query.is("ListPrice", null).not("TotalActualRent", "is", null);
  if (sp.beds) query = query.gte("BedroomsTotal", Number(sp.beds));
  if (sp.baths) query = query.gte("BathroomsTotalInteger", Number(sp.baths));
  if (sp.homeType) query = query.eq("StructureTypeText", sp.homeType);
  const priceCol = sp.type === "rent" ? "TotalActualRent" : "ListPrice";
  if (sp.minPrice) query = query.gte(priceCol, Number(sp.minPrice));
  if (sp.maxPrice) query = query.lte(priceCol, Number(sp.maxPrice));
  query = query.order("OriginalEntryTimestamp", { ascending: false });

  const [{ data: listings, count }, cityList, typeCounts] = await Promise.all([
    query,
    fixedCity ? Promise.resolve([]) : listNormalizedCities(),
    cityVariants ? getCachedTypeCounts(mls, cityVariants) : Promise.resolve({} as Record<string, number>),
  ]);
  const cards = listingCardsWithAds((listings ?? []) as GridListing[], _ads);

  const cities = fixedCity ? [] : cityList;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const rows = (listings ?? []) as GridListing[]; // cards (with ads) built above

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
        <nav className="text-sm text-muted" aria-label="Breadcrumb"><a href="/">Home</a> / {fixedCity ? <><a href="/ontario-real-estate">Ontario Real Estate</a> / <span>{fixedCity}</span></> : <span>Search</span>}</nav>
        <h1 className="font-display text-4xl font-extrabold md:text-5xl">
          {heading ?? (hasLocation ? `${total.toLocaleString()} listings near you` : effectiveCity ? `${total.toLocaleString()} listings in ${effectiveCity}` : `${total.toLocaleString()} listings`)}
        </h1>
        {hasLocation ? (
          <p className="text-sm text-muted">
            Showing listings within 10 km of your location.{" "}
            <a href={hrefFor({ lat: undefined, lng: undefined, city: DEFAULT_CITY })} className="font-medium text-primary">Clear location</a>
          </p>
        ) : !fixedCity && cityWasDefaulted ? (
          <p className="text-sm text-muted">
            Showing {DEFAULT_CITY} by default. <a href={hrefFor({ city: ALL_CITIES_SENTINEL })} className="font-medium text-primary">Search all cities</a> instead.
          </p>
        ) : (
          <p className="text-muted">{total.toLocaleString()} properties available</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <ListingFilters
            basePath={basePath}
            sp={sp as Record<string, string | undefined>}
            showCitySearch={!fixedCity}
            cities={cities}
            typeCounts={typeCounts}
          />
        </div>
        <div className="hidden shrink-0 md:block">
          <ViewToggle view={view} hrefFor={(v) => hrefFor({ view: v })} />
        </div>
      </div>

      {view === "map" ? (
        <div className="h-[70vh] min-h-[480px]">
          <ListingsMap listings={rows} />
        </div>
      ) : view === "split" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className={`grid grid-cols-1 gap-5 ${perRow >= 3 ? "sm:grid-cols-2" : ""}`}>
            {cards.length ? cards : (
              <div className="col-span-full rounded-2xl bg-white p-10 text-center text-muted">No listings match your search right now.</div>
            )}
          </div>
          <div className="h-[70vh] min-h-[480px] lg:sticky lg:top-24">
            <ListingsMap listings={rows} />
          </div>
        </div>
      ) : (
        <div className={`grid grid-cols-1 gap-5 ${GRID_COLS[perRow]}`}>
          {cards.length ? cards : (
            <div className="col-span-full rounded-2xl bg-white p-10 text-center text-muted">No listings match your search right now.</div>
          )}
        </div>
      )}

      {view !== "map" ? <Pagination page={page} totalPages={totalPages} hrefFor={(p) => hrefFor({ page: p })} /> : null}
    </div>
  );
}
