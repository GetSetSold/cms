import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveHood, getHoodStats, getHoodListings } from "@/lib/neighbourhoods";
import { citySlug } from "@/lib/mls";
import { getSettings, getLogo } from "@/lib/cms";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { ListingCard } from "@/components/listings/ListingCard";
import { ListingFilters } from "@/components/listings/ListingFilters";
import { Pagination } from "@/components/listings/Pagination";
import { CityStatsSection } from "@/components/listings/CityStatsSection";
import { CityEditorial } from "@/components/listings/CityEditorial";
import { CityFaq } from "@/components/listings/CityFaq";

export const dynamic = "force-dynamic";

const PER_PAGE = 24;

type Params = { city: string; hood: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { city: cityParam, hood: hoodParam } = await params;
  const hood = await resolveHood(cityParam, hoodParam);
  if (!hood) return { title: "Not found" };
  const url = `/${citySlug(hood.city)}-real-estate/${hood.hoodSlug}`;
  return {
    title: `Homes for sale in ${hood.hood}, ${hood.city}`,
    description: `Browse ${hood.count} MLS® listings in ${hood.hood}, ${hood.city}. Live market stats, FAQs and current homes for sale and rent.`,
    alternates: { canonical: url },
  };
}

export default async function NeighbourhoodPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ page?: string; type?: string; minPrice?: string; maxPrice?: string; beds?: string; baths?: string; homeType?: string }>;
}) {
  const { city: cityParam, hood: hoodParam } = await params;
  const sp = await searchParams;
  const hood = await resolveHood(cityParam, hoodParam);
  if (!hood) notFound();

  const page = Math.max(1, Number(sp.page) || 1);
  const cityUrl = `/${citySlug(hood.city)}-real-estate`;
  const hoodUrl = `${cityUrl}/${hood.hoodSlug}`;

  const filters = {
    type: sp.type,
    minPrice: sp.minPrice,
    maxPrice: sp.maxPrice,
    beds: sp.beds,
    baths: sp.baths,
    homeType: sp.homeType,
  };
  const [settings, stats, { listings, total }] = await Promise.all([
    getSettings(),
    getHoodStats(hood.city, hood.hood),
    getHoodListings(hood.city, hood.hood, page, PER_PAGE, filters),
  ]);
  const logo = await getLogo(settings);
  const themeVars_ = themeVars(settings);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const hrefFor = (p: number) => (p <= 1 ? hoodUrl : `${hoodUrl}?page=${p}`);

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

        <div className="mt-6">
          <ListingFilters basePath={hoodUrl} sp={sp as Record<string, string | undefined>} />
        </div>

        {listings.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((l) => (
              <ListingCard key={l.ListingKey} listing={l} />
            ))}
          </div>
        ) : (
          <p className="mt-8 rounded-2xl bg-white p-6 text-muted">
            No listings found in {hood.hood} right now — check back soon or browse{" "}
            <a href={cityUrl} className="font-medium text-primary">all of {hood.city}</a>.
          </p>
        )}

        {totalPages > 1 ? (
          <div className="mt-8">
            <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
          </div>
        ) : null}

        <CityStatsSection stats={stats} />
        <CityEditorial stats={stats} />
        <CityFaq stats={stats} />
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
