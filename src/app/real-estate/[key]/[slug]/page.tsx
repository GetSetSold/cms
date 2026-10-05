import type { Metadata } from "next";
import { notFound, redirect, permanentRedirect } from "next/navigation";
import { createMlsClient, daysOnMarket, displayValue, isSale, mediaItems, priceDisplay, resolveCitySlug, citySlug, listingSlug, type GridListing, type PropertyListing } from "@/lib/mls";
import { seoTitle } from "@/lib/seo";
import { getSettings, getLogo } from "@/lib/cms";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { ListingCard } from "@/components/listings/ListingCard";
import { ListingGallery } from "@/components/listings/ListingGallery";
import { ListingContactCard } from "@/components/listings/ListingContactCard";
import { ListingNearbyPlaces } from "@/components/listings/ListingNearbyPlaces";
import { LocationDescription, PropertySummary, LandAndLot, ConstructionExterior, SystemsUtilities, Financials, FieldTable, RoomsBlock, MapDirections } from "@/components/listings/ListingDetailBlocks";
import { createClient } from "@/lib/supabase/server";
import type { CmsForm } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getInquiryForm(): Promise<CmsForm | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("forms").select("*").eq("slug", "listing-inquiry").eq("is_active", true).maybeSingle();
  return data as CmsForm | null;
}

async function getListing(key: string) {
  const mls = createMlsClient();
  const { data } = await mls.from("property").select("*").eq("ListingKey", key).maybeSingle();
  return data as PropertyListing | null;
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

export async function generateMetadata({ params }: { params: Promise<{ key: string; slug: string }> }): Promise<Metadata> {
  const { key } = await params;
  const listing = await getListing(decodeURIComponent(key));
  if (!listing) return { title: "Listing not found" };
  const title = await seoTitle(`${listing.UnparsedAddress ?? listing.ListingKey} — ${priceDisplay(listing)}`);
  const ogImage = mediaItems(listing.Media)[0]?.MediaURL;
  return {
    title,
    description: (listing.PublicRemarks ?? "").slice(0, 155),
    alternates: { canonical: `/real-estate/${encodeURIComponent(listing.ListingKey)}/${listingSlug(listing)}` },
    openGraph: {
      title,
      description: (listing.PublicRemarks ?? "").slice(0, 155),
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: (listing.PublicRemarks ?? "").slice(0, 155),
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

const statFields = (listing: PropertyListing, dom: number | null) =>
  [
    { label: "Days on market", value: displayValue(dom != null ? `${dom} ${dom === 1 ? "day" : "days"}` : null) || null },
    { label: "Bedrooms", value: displayValue(listing.BedroomsTotal) || null },
    { label: "Bathrooms", value: displayValue(listing.BathroomsTotalInteger) || null },
    { label: "Parking", value: displayValue(listing.ParkingTotal) || null },
    { label: "Type", value: displayValue(listing.StructureType ?? listing.PropertySubType) || null },
    { label: "Stories", value: displayValue(listing.Stories) || null },
    { label: "Year built", value: displayValue(listing.YearBuilt) || null },
    { label: "Sq ft", value: displayValue(listing.AboveGradeFinishedArea ? Number(listing.AboveGradeFinishedArea).toLocaleString() : null) || null },
  ];

export default async function ListingDetailPage({ params }: { params: Promise<{ key: string; slug: string }> }) {
  const { key, slug } = await params;
  const listing = await getListing(decodeURIComponent(key));
  const inquiryForm = await getInquiryForm();
  if (!listing) {
    const city = await resolveCitySlug(decodeURIComponent(key));
    if (city) redirect(`/listings/city/${citySlug(city)}`);
    notFound();
  }

  // The slug is cosmetic — ListingKey is the lookup. A wrong or stale slug
  // 301s to the canonical URL so link equity consolidates on one address.
  const correctSlug = listingSlug(listing);
  if (slug !== correctSlug) {
    permanentRedirect(`/real-estate/${encodeURIComponent(listing.ListingKey)}/${correctSlug}`);
  }

  const [settings, similar] = await Promise.all([getSettings(), getSimilar(listing)]);
  const logo = await getLogo(settings);
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
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      <SiteHeader settings={settings} logo={logo} />
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
                <span>MLS® <strong className="text-ink">{listing.ListingId ?? listing.ListingKey}</strong></span>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl bg-white">
              <FieldTable mobileCols={4} variant="stats" fields={statFields(listing, dom)} />
            </div>

            {listing.PublicRemarks ? (
              <div className="rounded-2xl bg-white p-6">
                <h2 className="mb-3 border-b border-line pb-3 font-display text-[1.0rem]">About this property</h2>
                <p className="whitespace-pre-line text-justify text-[0.85rem] leading-relaxed text-muted">{listing.PublicRemarks}</p>
              </div>
            ) : null}

            {(listing.Heating || listing.Cooling || listing.Basement) ? (
              <SystemsUtilities listing={listing} />
            ) : null}

            <LocationDescription listing={listing} />

            <MapDirections listing={listing} />

            <PropertySummary listing={listing} />

            <RoomsBlock listing={listing} />

            <LandAndLot listing={listing} />

            <ConstructionExterior listing={listing} />

            <Financials listing={listing} sale={sale} />
          </div>

          <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
            <ListingContactCard listing={listing} form={inquiryForm} />
          </div>
        </div>

        {(() => {
          const nlat = Number(listing.Latitude);
          const nlng = Number(listing.Longitude);
          return Number.isFinite(nlat) && Number.isFinite(nlng) && (nlat !== 0 || nlng !== 0) ? (
            <div className="mt-10">
              <ListingNearbyPlaces lat={nlat} lng={nlng} listingKey={listing.ListingKey} />
            </div>
          ) : null;
        })()}

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
