import Link from "next/link";
import type { GridListing } from "@/lib/mls";
import { isSale, priceDisplay } from "@/lib/mls";

// Placeholder "popular" heuristic — no real signal exists in the DDF feed for
// this. Swap for a real field (e.g. a view count or a manual flag) later.
const isPopular = (l: GridListing) => (l.PhotosCount ?? 0) >= 8;

export function ListingCard({ listing }: { listing: GridListing }) {
  const sale = isSale(listing);
  const popular = isPopular(listing);
  return (
    <Link href={`/listings/${encodeURIComponent(listing.ListingKey)}`} className="group flex flex-col overflow-hidden rounded-2xl bg-white">
      <div className="relative aspect-[4/3] overflow-hidden bg-soft">
        {listing.Media ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.Media} alt="" className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">No photo</div>
        )}
        {popular ? (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-white">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.9 7.1.6-5.4 4.7 1.7 7-6.3-3.9-6.3 3.9 1.7-7L2 9.5l7.1-.6z" /></svg>
            Popular
          </span>
        ) : null}
        <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-primary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M12 20s-7-4.35-9.5-8.5C.7 8.1 2.4 4.5 6 4.5c2 0 3.4 1.1 6 3.5 2.6-2.4 4-3.5 6-3.5 3.6 0 5.3 3.6 3.5 7C19 15.65 12 20 12 20z" />
          </svg>
        </span>
        <span className={`absolute bottom-3 left-3 rounded px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white ${sale ? "bg-ink" : "bg-accent"}`}>
          {sale ? "For Sale" : "For Rent"}
        </span>
      </div>
      <div className="flex flex-col gap-1 p-4">
        <div className="text-lg font-semibold text-primary">{priceDisplay(listing)}</div>
        <div className="truncate text-[15px] font-medium text-ink">{listing.UnparsedAddress}</div>
        <div className="text-sm text-muted">{listing.City}</div>
        <div className="mt-2 flex gap-3 border-t border-line pt-2.5 text-[13px] text-muted">
          {listing.BedroomsTotal ? <span>{listing.BedroomsTotal} Beds</span> : null}
          {listing.BathroomsTotalInteger ? <span>{listing.BathroomsTotalInteger} Bathrooms</span> : null}
          {listing.AboveGradeFinishedArea ? <span>{Number(listing.AboveGradeFinishedArea).toLocaleString()} m²</span> : null}
        </div>
      </div>
    </Link>
  );
}
