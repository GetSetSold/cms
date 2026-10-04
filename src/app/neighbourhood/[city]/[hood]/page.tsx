import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveHood, getHoodStats, getHoodListings } from "@/lib/neighbourhoods";
import { getHoodOgImage, ogImageMeta } from "@/lib/ogImage";
import { listingCardsWithAds } from "@/components/listings/ListingGrid";
import { seoTitle } from "@/lib/seo";
import { citySlug } from "@/lib/mls";
import { getSettings, getLogo } from "@/lib/cms";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { ListingCard } from "@/components/listings/ListingCard";
import { ListingFilters } from "@/components/listings/ListingFilters";
import { ViewToggle } from "@/components/listings/ViewToggle";
import { ListingsMap } from "@/components/listings/ListingsMap";
import { Pagination } from "@/components/listings/Pagination";
import { CityStatsSection } from "@/components/listings/CityStatsSection";
import { CityEditorial } from "@/components/listings/CityEditorial";
import { CityFaq } from "@/components/listings/CityFaq";
import { LocalMarketPulse } from "@/components/hpi/LocalMarketPulse";

export const dynamic = "force-dynamic";

const PER_PAGE = 12;

type Params = { city: string; hood: string };

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ page?: string; type?: string }>;
}): Promise<Metadata> {
  const [{ city: cityParam, hood: hoodParam }, sp] = await Promise.all([params, searchParams]);
  const hood = await resolveHood(cityParam, hoodParam);
  if (!hood) return { title: "Not found" };
  const url = `/${citySlug(hood.city)}-real-estate/${hood.hoodSlug}`;
  const page = Math.max(1, Number(sp.page) || 1);
  const isRent = sp.type === "rent";
  const base = `${hood.hood}, ${hood.city} MLS® Listings & Real Estate for ${isRent ? "Rent" : "Sale"}`;
  const title = await seoTitle(page > 1 ? `${base} (Page ${page})` : base);
  const description = `Browse ${hood.count} MLS® listings for ${isRent ? "rent" : "sale"} in ${hood.hood}, ${hood.city}. Live market stats, FAQs and updated listings.`;
  const ogImage = await getHoodOgImage(hood.city, hood.hood);
  return {
    title,
    description,
    alternates: { canonical: url },
    ...ogImageMeta(ogImage, title, description),
  };
}

export default async function NeighbourhoodPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ page?: string; type?: string; minPrice?: string; maxPrice?: string; beds?: string; baths?: string; homeType?: string; view?: string }>;
}) {
  const { city: cityParam, hood: hoodParam } = await params;
  const sp = await searchParams;
  const hood = await resolveHood(cityParam, hoodParam);
  if (!hood) notFound();

  const page = Math.max(1, Number(sp.page) || 1);
  const cityUrl = `/${citySlug(hood.city)}-real-estate`;
  const hoodUrl = `${cityUrl}/${hood.hoodSlug}`;
  const view = (["grid", "split", "map"].includes(sp.view ?? "") ? sp.view : "grid") as "grid" | "split" | "map";

  const hrefFor = (patch: Record<string, string | undefined>) => {
    const merged: Record<string, string> = {};
    for (const [k, v] of Object.entries(sp)) if (v) merged[k] = v as string;
    for (const [k, v] of Object.entries(patch)) {
      if (!v) delete merged[k];
      else merged[k] = v;
    }
    if (!("page" in patch)) delete merged.page;
    const qs = new URLSearchParams(merged).toString();
    return `${hoodUrl}${qs ? `?${qs}` : ""}`;
  };

  const filters = {
    type: sp.type,
    minPrice: sp.minPrice,
    maxPrice: sp.maxPrice,
    beds: sp.beds,
    baths: sp.baths,
    homeType: sp.homeType,
  };
  // Fetch settings first: if ad shows, use 23 listings so 23 + 1 ad = 24 cards
  const settings = await getSettings();
  const _ads = (settings as { ads?: Parameters<typeof listingCardsWithAds>[1] } | null)?.ads;
  const _showAd = !!(_ads?.grid_ad_enabled && _ads?.grid_ad_code?.includes("data-ad-client"));
  const perPage = _showAd && view !== "map" ? PER_PAGE - 1 : PER_PAGE;
  const [stats, { listings, total }] = await Promise.all([
    getHoodStats(hood.city, hood.hood),
    getHoodListings(hood.city, hood.hood, view === "map" ? 1 : page, view === "map" ? 100 : perPage, filters),
  ]);
  const cards = listingCardsWithAds(listings, _ads);
  const typeCounts: Record<string, number> = {};
  for (const t of stats.typeBreakdown ?? []) typeCounts[t.label] = t.count;
  const logo = await getLogo(settings);
  const themeVars_ = themeVars(settings);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));


  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "/" },
      { "@type": "ListItem", position: 2, name: "Ontario Real Estate", item: "/ontario-real-estate" },
      { "@type": "ListItem", position: 3, name: `${hood.city} Real Estate`, item: cityUrl },
      { "@type": "ListItem", position: 4, name: hood.hood, item: hoodUrl },
    ],
  };

  return (
    <div style={themeVars_} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      <SiteHeader settings={settings} logo={logo} />
      <main className="mx-auto w-full max-w-7xl px-5 py-10 md:px-10 md:py-14">
        <div className="mb-4 text-sm text-muted">
          <a href="/" className="hover:text-ink">Home</a>
          {" / "}
          <a href="/ontario-real-estate" className="hover:text-ink">Ontario Real Estate</a>
          {" / "}
          <a href={cityUrl} className="hover:text-ink">{hood.city} Real Estate</a>
          {" / "}
          <span>{hood.hood}</span>
        </div>

        <h1 className="font-display text-3xl md:text-4xl">
          Homes for sale in {hood.hood}, {hood.city}
        </h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted">
          {total.toLocaleString()} active MLS® listings in {hood.hood}. Updated daily from the live feed.
        </p>

        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <ListingFilters basePath={hoodUrl} sp={sp as Record<string, string | undefined>} typeCounts={typeCounts} />
          </div>
          <div className="hidden shrink-0 md:block">
            <ViewToggle view={view} hrefFor={(v) => hrefFor({ view: v === "grid" ? undefined : v })} />
          </div>
        </div>

        {view === "map" ? (
          <div className="mt-4 h-[70vh] min-h-[480px]">
            <ListingsMap listings={listings} />
          </div>
        ) : view === "split" ? (
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {cards.length ? cards : (
                <p className="col-span-full rounded-2xl bg-white p-6 text-muted">No listings found in {hood.hood} right now.</p>
              )}
            </div>
            <div className="h-[70vh] min-h-[480px] lg:sticky lg:top-24">
              <ListingsMap listings={listings} />
            </div>
          </div>
        ) : listings.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cards}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-white p-6 text-muted">
            No listings found in {hood.hood} right now — check back soon or browse{" "}
            <a href={cityUrl} className="font-medium text-primary">all of {hood.city}</a>.
          </p>
        )}

        {view !== "map" && totalPages > 1 ? (
          <div className="mt-8">
            <Pagination page={page} totalPages={totalPages} hrefFor={(p) => hrefFor({ page: p <= 1 ? undefined : String(p) })} />
          </div>
        ) : null}

        <CityStatsSection stats={stats} />
        <CityEditorial stats={stats} />
        <CityFaq stats={stats} />
        <LocalMarketPulse citySlug={citySlug(hood.city)} cityName={hood.city} />
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </div>
  );
}
