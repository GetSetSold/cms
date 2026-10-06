import { listingSlug, type PropertyListing } from "@/lib/mls";

/**
 * CREA/REALTOR.ca attribution block (DDF requirement).
 * Placed in the right sidebar after the ad slot.
 * Logo links to the same listing on realtor.ca.
 */
export function RealtorAttribution({ listing }: { listing: PropertyListing }) {
  const mlsId = listing.ListingId ?? listing.ListingKey;
  const slug = listingSlug({ UnparsedAddress: listing.UnparsedAddress, City: listing.City });
  const realtorUrl = `https://www.realtor.ca/real-estate/${mlsId}/${slug}`;

  return (
    <div className="rounded-2xl bg-white p-5">
      <div className="text-[12px] text-muted">Listing Data Provided By</div>
      <a
        id="realtor-logo"
        href={realtorUrl}
        target="_blank"
        rel="noopener"
        className="mt-2 inline-block"
      >
        <img
          width="85"
          src="https://www.realtor.ca/images/en-ca/powered_by_realtor.svg"
          alt="Powered by: REALTOR.ca"
          loading="lazy"
        />
      </a>
      <p className="mt-3 text-[12px] font-normal leading-relaxed text-muted">
        The listing data above is provided under copyright by the Canadian Real
        Estate Association. While the information is considered reliable, its
        accuracy is not guaranteed by the Canadian Real Estate Association or
        getsetsold.ca. Neither getsetsold.ca nor its affiliates make any
        representations or warranties, express or implied, regarding the accuracy
        or completeness of the information presented here.
      </p>
    </div>
  );
}
