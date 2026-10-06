import { slugifyAddress, type PropertyListing } from "@/lib/mls";

/**
 * CREA/REALTOR.ca attribution block (DDF requirement).
 * Full-width at the bottom of the listing page, after Similar Listings.
 * Logo links to the same listing on realtor.ca.
 */
export function RealtorAttribution({ listing }: { listing: PropertyListing }) {
  // realtor.ca uses the ListingKey in its URL
  const mlsId = listing.ListingKey;
  // realtor.ca slug style: address + city + district, e.g. 32-steven-court-brampton-heart-lake-west
  const slug = slugifyAddress(listing.UnparsedAddress, listing.City, listing.CityRegion);
  const realtorUrl = `https://www.realtor.ca/real-estate/${mlsId}/${slug}`;

  return (
    <div className="rounded-[var(--radius-lg)] bg-white p-5">
      <div className="text-[12px] text-muted">Listing Data Provided By</div>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <a
          id="realtor-logo"
          href={realtorUrl}
          target="_blank"
          rel="noopener"
          className="shrink-0"
        >
          <img
            width="85"
            src="https://www.realtor.ca/images/en-ca/powered_by_realtor.svg"
            alt="Powered by: REALTOR.ca"
            loading="lazy"
          />
        </a>
        <p className="text-[12px] font-normal leading-snug text-muted">
          The listing data above is provided under copyright by the Canadian Real
          Estate Association. While the information is considered reliable, its
          accuracy is not guaranteed by the Canadian Real Estate Association or
          getsetsold.ca. Neither getsetsold.ca nor its affiliates make any
          representations or warranties, express or implied, regarding the accuracy
          or completeness of the information presented here.
        </p>
      </div>
    </div>
  );
}
