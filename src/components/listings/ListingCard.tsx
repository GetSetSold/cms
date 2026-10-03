import type { GridListing } from "@/lib/mls";
import { isSale, priceDisplay, listingSlug } from "@/lib/mls";
import { ListingCardShell } from "./ListingCardShell";

// Placeholder "popular" heuristic — no real signal exists in the DDF feed for
// this. Swap for a real field (e.g. a view count or a manual flag) later.
const isPopular = (l: GridListing) => (l.PhotosCount ?? 0) >= 8;

export function ListingCard({ listing }: { listing: GridListing }) {
  const sale = isSale(listing);
  return (
    <ListingCardShell
      href={`/real-estate/${encodeURIComponent(listing.ListingKey)}/${listingSlug(listing)}`}
      image={listing.Media}
      popular={isPopular(listing)}
      showFavorite
      statusLabel={sale ? "For Sale" : "For Rent"}
      statusTone={sale ? "dark" : "accent"}
      price={priceDisplay(listing)}
      address={listing.UnparsedAddress ?? ""}
      city={listing.City}
      beds={listing.BedroomsTotal}
      baths={listing.BathroomsTotalInteger}
      area={listing.AboveGradeFinishedArea ? `${Number(listing.AboveGradeFinishedArea).toLocaleString()} m²` : null}
    />
  );
}
