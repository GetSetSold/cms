import type { Metadata } from "next";
import { createMlsClient, type GridListing } from "@/lib/mls";
import { getSettings } from "@/lib/cms";
import { themeFontHref, themeVars } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { ListingCard } from "@/components/listings/ListingCard";

export const dynamic = "force-dynamic";

type SP = { city?: string; type?: string; beds?: string; page?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const { city } = await searchParams;
  const title = city ? `Homes for sale in ${city}` : "All listings";
  return { title, alternates: { canonical: city ? `/listings?city=${encodeURIComponent(city)}` : "/listings" } };
}

const PAGE_SIZE = 24;

export default async function ListingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const settings = await getSettings();
  const mls = createMlsClient();

  const page = Math.max(1, Number(sp.page) || 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = mls.from("grid").select("*", { count: "exact" }).range(from, from + PAGE_SIZE - 1);
  if (sp.city) query = query.eq("City", sp.city);
  if (sp.type === "sale") query = query.not("ListPrice", "is", null);
  if (sp.type === "rent") query = query.is("ListPrice", null).not("TotalActualRent", "is", null);
  if (sp.beds) query = query.gte("BedroomsTotal", Number(sp.beds));
  query = query.order("OriginalEntryTimestamp", { ascending: false });

  const [{ data: listings, count }, { data: cityRows }] = await Promise.all([
    query,
    mls.from("grid").select("City").not("City", "is", null),
  ]);

  const cities = [...new Set((cityRows ?? []).map((r) => r.City as string))].sort();
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (patch: Partial<SP>) => {
    const params = new URLSearchParams({ ...sp, ...patch } as Record<string, string>);
    Object.keys(patch).forEach((k) => (patch as Record<string, string | undefined>)[k] === "" && params.delete(k));
    params.delete("page");
    const qs = params.toString();
    return `/listings${qs ? `?${qs}` : ""}`;
  };

  const themeVars_ = themeVars(settings);

  return (
    <div style={themeVars_} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      <SiteHeader settings={settings} />
      <main className="mx-auto w-full max-w-7xl px-5 py-10 md:px-10 md:py-14">
        <div className="mb-8 flex flex-col gap-2">
          <div className="text-sm text-muted"><a href="/" className="hover:text-ink">Home</a> / <span>Search</span></div>
          <h1 className="font-display text-4xl md:text-5xl">{sp.city ? `${total.toLocaleString()} listings in ${sp.city}` : "Search properties"}</h1>
          <p className="text-muted">{sp.city ? `Find your next home in ${sp.city}.` : `${total.toLocaleString()} properties available`}</p>
        </div>

        <form className="mb-8 flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-[0_8px_30px_rgba(20,20,43,0.06)] sm:flex-row sm:items-center" action="/listings">
          <label className="flex flex-1 items-center gap-2 rounded-xl bg-ground px-3.5 py-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-primary" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input name="city" list="cities" defaultValue={sp.city ?? ""} placeholder="Search city or neighbourhood" className="w-full border-0 bg-transparent p-0 text-sm outline-none placeholder:text-muted" />
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

        {listings?.length ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(listings as GridListing[]).map((l) => <ListingCard key={l.ListingKey} listing={l} />)}
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-10 text-center text-muted">No listings match your search right now.</div>
        )}

        {totalPages > 1 ? (
          <nav className="mt-10 flex justify-center gap-2" aria-label="Pagination">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <a key={p} href={`${buildHref({})}${buildHref({}).includes("?") ? "&" : "?"}page=${p}`}
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${p === page ? "bg-ink text-white" : "bg-white text-ink"}`}>
                {p}
              </a>
            ))}
          </nav>
        ) : null}
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
