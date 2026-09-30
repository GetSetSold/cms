import type { PropertyListing } from "@/lib/mls";
import { priceDisplay } from "@/lib/mls";
import { CmsFormRenderer } from "@/components/blocks/CmsFormRenderer";
import type { CmsForm } from "@/lib/types";

/** `form` is the real "Listing Inquiry" form (editable in Admin → Forms), or null if it's been
 *  deactivated or deleted — falls back to a plain mailto/call prompt rather than showing nothing. */
export function ListingContactCard({ listing, form }: { listing: PropertyListing; form: CmsForm | null }) {
  return (
    <div className="card flex flex-col gap-4">
      <div className="text-2xl font-semibold">{priceDisplay(listing)}</div>
      {listing.OfficeName ? <div className="text-sm text-muted">{listing.OfficeName}</div> : null}
      {form ? (
        <CmsFormRenderer form={form} extraFields={{ listing_key: listing.ListingKey, address: listing.UnparsedAddress }}
          secondaryAction={{ label: "Call now", href: "tel:+14166057488" }} />
      ) : (
        <>
          <p className="text-sm text-muted">Contact us directly to ask about this listing.</p>
          <a href="tel:+14166057488" className="btn h-11 justify-center">Call now</a>
        </>
      )}
    </div>
  );
}
