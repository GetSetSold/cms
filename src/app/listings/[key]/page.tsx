import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createMlsClient, daysOnMarket, displayValue, isSale, mediaItems, priceDisplay, type GridListing, type PropertyListing } from "@/lib/mls";
import { getSettings } from "@/lib/cms";
import { themeFontHref, themeVars } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { ListingCard } from "@/components/listings/ListingCard";
import { ListingGallery } from "@/components/listings/ListingGallery";
import { ListingContactCard } from "@/components/listings/ListingContactCard";

export const dynamic = "force-dynamic";

async function getListing(key: string) {
  const mls = createMlsClient();
  const { data } = await mls.from("property").select("*").eq("ListingKey", key).maybeSingle();
  return data as PropertyListing | null;
}

const slugify = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "-");

/** /listings/[key] is reserved for actual listing keys. If someone lands here
 *  with a city name instead (e.g. /listings/cayuga), send them to the real
 *  city page at /city/[slug] rather than showing a dead end. */
async function matchingCitySlug(key: string): Promise<string | null> {
  const mls = createMlsClient();
  const { data } = await mls.from("grid").select("City").not("City", "is", null).limit(2000);
  const cities = [...new Set((data ?? []).map((r) => r.City as string))];
  const match = cities.find((c) => slugify(c) === key.toLowerCase());
  return match ? slugify(match) : null;
}

async function getSimilar(listing: PropertyListing) {
  if (!listing.City) return [];
  const mls = createMlsClient();
  const sale = isSale(listing);
  const base = mls.from("grid").select("*").eq("City", listing.City).neq("ListingKey", listing.ListingKey).limit(4);
  const { data } = sale
    ? await base.not("ListPrice", "is", null)
    : await base.not("TotalActualRent", "is", null);
  return (data ?? []) as GridListing[];
}

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const { key } = await params;
  const listing = await getListing(decodeURIComponent(key));
  if (!listing) return { title: "Listing not found" };
  const title = `${listing.UnparsedAddress ?? listing.ListingKey} — ${priceDisplay(listing)}`;
  return {
    title,
    description: (listing.PublicRemarks ?? "").slice(0, 155),
    alternates: { canonical: `/listings/${encodeURIComponent(listing.ListingKey)}` },
  };
}

const stat = (value: unknown, label: string) => {
  const v = displayValue(value);
  if (!v) return null;
  return (
    <div className="flex flex-col items-center gap-1 border-r border-b border-line px-2 py-5 text-center last:border-r-0">
      <div className="font-display text-lg font-semibold">{v}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
};

export default async function ListingDetailPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const listing = await getListing(decodeURIComponent(key));
  if (!listing) {
    const citySlug = await matchingCitySlug(decodeURIComponent(key));
    if (citySlug) redirect(`/city/${citySlug}`);
    notFound();
  }

  const [settings, similar] = await Promise.all([getSettings(), getSimilar(listing)]);
  const photos = mediaItems(listing.Media);
  const dom = daysOnMarket(listing.OriginalEntryTimestamp);
  const sale = isSale(listing);

  const themeVars_ = themeVars(settings);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Residence",
    name: listing.UnparsedAddress,
    address: { "@type": "PostalAddress", addressLocality: listing.City, addressRegion: listing.Province, postalCode: listing.PostalCode },
    numberOfRooms: listing.BedroomsTotal,
    ...(photos[0] ? { image: photos[0].MediaURL } : {}),
  };

  return (
    <div style={themeVars_} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      <SiteHeader settings={settings} />
      <main className="mx-auto w-full max-w-7xl px-5 py-8 md:px-10 md:py-12">
        <div className="mb-4 text-sm text-muted">
          <a href="/" className="hover:text-ink">Home</a> / <a href="/listings" className="hover:text-ink">Listings</a> / {listing.City}
        </div>

        <ListingGallery items={photos} />

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl bg-white p-6">
              <span className={`mb-3 inline-block rounded px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white ${sale ? "bg-ink" : "bg-accent"}`}>
                {sale ? "For Sale" : "For Rent"}
              </span>
              <div className="font-display text-3xl md:text-4xl">{priceDisplay(listing)}</div>
              <div className="mt-2 text-lg">{listing.UnparsedAddress}{listing.City ? `, ${listing.City}` : ""}{listing.Province ? `, ${listing.Province}` : ""}</div>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-sm text-muted">
                <span>MLS® <strong className="text-ink">{listing.ListingKey}</strong></span>
              </div>
            </div>

            <div className="grid grid-cols-4 overflow-hidden rounded-2xl bg-white">
              {stat(dom != null ? `${dom} ${dom === 1 ? "day" : "days"}` : null, "Days on market")}
              {stat(listing.BedroomsTotal, "Bedrooms")}
              {stat(listing.BathroomsTotalInteger, "Bathrooms")}
              {stat(listing.ParkingTotal, "Parking")}
              {stat(listing.AboveGradeFinishedArea ? Number(listing.AboveGradeFinishedArea).toLocaleString() : null, "Sq ft")}
              {stat(listing.StructureType ?? listing.PropertySubType, "Type")}
              {stat(listing.YearBuilt, "Year built")}
            </div>

            {listing.PublicRemarks ? (
              <div className="rounded-2xl bg-white p-6">
                <h2 className="mb-3 border-b border-line pb-3 font-display text-xl">About this property</h2>
                <p className="whitespace-pre-line leading-relaxed text-muted">{listing.PublicRemarks}</p>
              </div>
            ) : null}

            {(listing.Heating || listing.Cooling || listing.Basement) ? (
              <div className="rounded-2xl bg-white p-6">
                <h2 className="mb-3 border-b border-line pb-3 font-display text-xl">Features</h2>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {listing.Heating ? <div className="rounded-lg bg-ground px-3 py-2.5">Heating: {displayValue(listing.Heating)}</div> : null}
                  {listing.Cooling ? <div className="rounded-lg bg-ground px-3 py-2.5">Cooling: {displayValue(listing.Cooling)}</div> : null}
                  {listing.Basement ? <div className="rounded-lg bg-ground px-3 py-2.5">Basement: {displayValue(listing.Basement)}</div> : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
            <ListingContactCard listing={listing} />
          </div>
        </div>

        {similar.length ? (
          <div className="mt-12">
            <h2 className="mb-5 font-display text-2xl">Similar listings</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((l) => <ListingCard key={l.ListingKey} listing={l} />)}
            </div>
          </div>
        ) : null}
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}
