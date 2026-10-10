import type { GridListing } from "@/lib/mls";
import { isSale, priceDisplay, listingSlug, daysOnMarket } from "@/lib/mls";
import { ListingCardShell } from "./ListingCardShell";

export function ListingCard({ listing }: { listing: GridListing }) {
  const sale = isSale(listing);
  return (
    <ListingCardShell
      href={`/real-estate/${encodeURIComponent(listing.ListingKey)}/${listingSlug(listing)}`}
      image={listing.Media}
      showFavorite
      listingKey={listing.ListingKey}
      statusLabel={sale ? "For Sale" : "For Rent"}
      statusTone={sale ? "dark" : "accent"}
      price={priceDisplay(listing)}
      address={listing.UnparsedAddress ?? ""}
      city={listing.City}
      province={listing.Province}
      postalCode={listing.PostalCode}
      beds={listing.BedroomsTotal}
      baths={listing.BathroomsTotalInteger}
      area={listing.AboveGradeFinishedArea ? `${Number(listing.AboveGradeFinishedArea).toLocaleString()} m²` : null}
      mlsNumber={listing.ListingId ?? null}
      brokerage={listing.OfficeName}
      listedDays={daysOnMarket(listing.OriginalEntryTimestamp ?? null)}
      photoCount={listing.PhotosCount}
    />
  );
}
