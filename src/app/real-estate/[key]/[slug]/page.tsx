import type { Metadata } from "next";
import { notFound, redirect, permanentRedirect } from "next/navigation";
import { createMlsClient, daysOnMarket, displayValue, isSale, mediaItems, priceDisplay, resolveCitySlug, citySlug, listingSlug, normalizeCity, type GridListing, type PropertyListing } from "@/lib/mls";
import { hoodSlug } from "@/lib/neighbourhoods";
import { seoTitle } from "@/lib/seo";
import { getSettings, getLogo, getSvgs } from "@/lib/cms";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { ListingCard } from "@/components/listings/ListingCard";
import { ListingGallery } from "@/components/listings/ListingGallery";
import { ListingContactCard } from "@/components/listings/ListingContactCard";
import { ListingNearbyPlaces } from "@/components/listings/ListingNearbyPlaces";
import { AffordabilityBanner } from "@/components/listings/AffordabilityBanner";
import { SimilarListings } from "@/components/listings/SimilarListings";
import { ContentAdSlot } from "@/components/ads/ContentAdSlot";
import { CollapsibleCard } from "@/components/listings/CollapsibleCard";
import { PromoBanner } from "@/components/listings/PromoBanner";
import { PaymentEstimate } from "@/components/listings/PaymentEstimate";
import { ShareButton } from "@/components/listings/ShareButton";
import { ListingMarketPulse } from "@/components/listings/ListingMarketPulse";
import { RealtorAttribution } from "@/components/listings/RealtorAttribution";
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
  const base = mls.from("grid").select("*").eq("City", listing.City).neq("ListingKey", listing.ListingKey).limit(20);
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
  const agentSvgs = settings.agent?.photo_svg_id ? await getSvgs([settings.agent.photo_svg_id]) : {};
  const agentPhotoSvg = settings.agent?.photo_svg_id ? agentSvgs[settings.agent.photo_svg_id] ?? null : null;
  const ads = (settings.ads ?? {}) as Record<string, unknown>;
  const adCode = typeof ads.grid_ad_code === "string" ? ads.grid_ad_code : "";
  const showListingAd = ads.listing_ad_enabled === true && adCode.includes("data-ad-client");
  const photos = mediaItems(listing.Media);
  const dom = daysOnMarket(listing.OriginalEntryTimestamp);
  const sale = isSale(listing);
  // Promo banners: buyer on For Sale, tenant on For Rent, only in selected cities.
  const promo = settings.promo ?? {};
  const promoCities = Array.isArray(promo.cities)
    ? promo.cities.map((c) => c.toLowerCase().trim()).filter(Boolean)
    : [];
  const inPromoCity = promoCities.length === 0 || promoCities.includes((listing.City ?? "").toLowerCase().trim());
  const showBuyerPromo = sale && promo.buyer_enabled === true && inPromoCity;
  const showTenantPromo = !sale && promo.tenant_enabled === true && inPromoCity;

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
      <main className="mx-auto w-full max-w-7xl min-w-0 overflow-x-clip px-5 py-8 md:px-10 md:py-12">
        <nav className="mb-4 text-sm text-muted" aria-label="Breadcrumb">
          {(() => {
            const city = normalizeCity(listing.City ?? "");
            const hood = ((listing.CityRegion || listing.SubdivisionName) ?? "").trim();
            const cityUrl = city ? `/${citySlug(city)}-real-estate` : "/listings";
            // Only show hood level if it exists and isn't just the city name again.
            const showHood = hood.length > 0 && hood.toLowerCase() !== city.toLowerCase();
            return (
              <>
                <a href="/">Home</a> /{" "}
                <a href="/listings">Listings</a> /{" "}
                {city ? <a href={cityUrl}>{city}</a> : null}
                {showHood ? (
                  <>
                    {" "}/ <a href={`${cityUrl}/${hoodSlug(hood)}`}>{hood}</a>
                  </>
                ) : null}
              </>
            );
          })()}
        </nav>

        <ListingGallery items={photos} />

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-6">
            <div className="rounded-[var(--radius-lg)] bg-white p-6">
              <span className={`mb-3 inline-block rounded-[var(--radius-label)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white ${sale ? "bg-ink" : "bg-accent"}`}>
                {sale ? "For Sale" : "For Rent"}
              </span>
              <div className="font-display text-3xl md:text-4xl">{priceDisplay(listing)}</div>
              {sale && Number(listing.ListPrice) > 0 ? (
                <PaymentEstimate price={Number(listing.ListPrice)} listingKey={String(listing.ListingKey ?? "")} />
              ) : null}
              <div className="mt-2 break-words text-lg">{listing.UnparsedAddress}{listing.City ? `, ${listing.City}` : ""}{listing.Province ? `, ${listing.Province}` : ""}{listing.PostalCode ? ` ${listing.PostalCode}` : ""}</div>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-sm text-muted">
                <span>MLS® <strong className="text-ink">{listing.ListingId ?? listing.ListingKey}</strong>{listing.OfficeName ? <> <span className="text-muted">|</span> {listing.OfficeName.toUpperCase()}</> : null}</span>
                <ShareButton title={`${listing.UnparsedAddress ?? "Listing"} — ${priceDisplay(listing)}`} url="" />
              </div>
            </div>

            <div className="overflow-hidden rounded-[var(--radius-lg)] bg-white">
              <FieldTable mobileCols={4} variant="stats" fields={statFields(listing, dom)} />
            </div>

            {showBuyerPromo ? <PromoBanner variant="buyer" listing={listing} /> : null}
            {showTenantPromo ? <PromoBanner variant="tenant" listing={listing} /> : null}
            {showListingAd ? <ContentAdSlot adCode={adCode} /> : null}
            {/* Mobile: flush accordion (no gaps). Desktop: spaced cards. */}
            <div className="flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-lg)] bg-white lg:gap-6 lg:overflow-visible lg:rounded-none lg:bg-transparent">
            {listing.PublicRemarks ? (
              <CollapsibleCard title="About this property">
                <p className="whitespace-pre-line px-6 py-5 text-justify text-[0.85rem] leading-relaxed text-muted">{listing.PublicRemarks}</p>
              </CollapsibleCard>
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
          </div>

          <div className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
            <ListingContactCard listing={listing} form={inquiryForm} agent={settings.agent} photoSvg={agentPhotoSvg} />
            {sale ? <AffordabilityBanner listing={listing} /> : null}
            {showListingAd ? <ContentAdSlot adCode={adCode} /> : null}
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

        {(() => {
          // HPI is sales data — hide on rental listings.
          if (!sale) return null;
          const city = normalizeCity(listing.City ?? "");
          return city ? (
            <div className="mt-10">
              <ListingMarketPulse citySlug={citySlug(city)} cityName={city} />
            </div>
          ) : null;
        })()}

        {similar.length ? <SimilarListings listings={similar} /> : null}

        <div className="mt-10">
          <RealtorAttribution listing={listing} />
        </div>
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}
