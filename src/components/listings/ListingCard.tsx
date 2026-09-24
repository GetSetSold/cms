import Link from "next/link";
import type { GridListing } from "@/lib/mls";
import { isSale, priceDisplay } from "@/lib/mls";

export function ListingCard({ listing }: { listing: GridListing }) {
  const sale = isSale(listing);
  return (
    <Link href={`/listings/${encodeURIComponent(listing.ListingKey)}`} className="group flex flex-col overflow-hidden rounded-2xl bg-white">
      <div className="relative aspect-[4/3] overflow-hidden bg-soft">
        {listing.Media ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.Media} alt="" className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">No photo</div>
        )}
        <span className={`absolute left-3 top-3 rounded px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white ${sale ? "bg-ink" : "bg-accent"}`}>
          {sale ? "For Sale" : "For Rent"}
        </span>
        {listing.PhotosCount ? (
          <span className="absolute bottom-3 right-3 rounded bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">{listing.PhotosCount} photos</span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1 p-4">
        <div className="text-lg font-semibold">{priceDisplay(listing)}</div>
        <div className="truncate text-[15px]">{listing.UnparsedAddress}</div>
        <div className="text-sm text-muted">{listing.City}</div>
        <div className="mt-1 flex gap-3 text-[13px] text-muted">
          {listing.BedroomsTotal ? <span>{listing.BedroomsTotal} bd</span> : null}
          {listing.BathroomsTotalInteger ? <span>{listing.BathroomsTotalInteger} ba</span> : null}
          {listing.AboveGradeFinishedArea ? <span>{Number(listing.AboveGradeFinishedArea).toLocaleString()} sqft</span> : null}
        </div>
      </div>
    </Link>
  );
}
