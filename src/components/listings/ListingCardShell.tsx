import Link from "next/link";
import { CardArrowButton } from "@/components/site/CardArrowButton";

export type ListingCardData = {
  href?: string;
  image: string | null;
  /** Bottom-left ribbon over the photo — same slot used for "For Sale"/"For
   *  Rent" on real listings, "Sold"/"Leased"/"Purchased" on history, and
   *  ready for "Pre-Con" or anything else later — just a label + a tone. */
  statusLabel: string;
  statusTone: "dark" | "accent" | "green" | "blue" | "purple";
  price: string;
  address: string;
  city?: string | null;
  beds?: number | null;
  baths?: number | null;
  area?: string | null; // pre-formatted, e.g. "1,507 m²" or "2,050 sqft" — caller decides the unit
  popular?: boolean;
  showFavorite?: boolean;
};

const TONE: Record<ListingCardData["statusTone"], string> = {
  dark: "bg-ink", accent: "bg-accent", green: "bg-[#1B8A5A]", blue: "bg-[#2B3A8C]", purple: "bg-primary",
};

export function ListingCardShell(d: ListingCardData) {
  const body = (
    <>
      <div className="relative aspect-[4/3] overflow-hidden bg-soft">
        {d.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.image} alt="" className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">No photo</div>
        )}
        {d.popular ? (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-white">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.9 7.1.6-5.4 4.7 1.7 7-6.3-3.9-6.3 3.9 1.7-7L2 9.5l7.1-.6z" /></svg>
            Popular
          </span>
        ) : null}
        {d.showFavorite ? (
          <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-primary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M12 20s-7-4.35-9.5-8.5C.7 8.1 2.4 4.5 6 4.5c2 0 3.4 1.1 6 3.5 2.6-2.4 4-3.5 6-3.5 3.6 0 5.3 3.6 3.5 7C19 15.65 12 20 12 20z" />
            </svg>
          </span>
        ) : null}
        <span className={`absolute bottom-3 left-3 rounded px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white ${TONE[d.statusTone]}`}>
          {d.statusLabel}
        </span>
        {d.href ? <CardArrowButton /> : null}
      </div>
      <div className="flex flex-col gap-1 p-4">
        <div className="text-lg font-semibold text-primary">{d.price}</div>
        <div className="truncate text-[15px] font-medium text-ink">{d.address}</div>
        {d.city ? <div className="text-sm text-muted">{d.city}</div> : null}
        {d.beds || d.baths || d.area ? (
          <div className="mt-2 flex gap-3 border-t border-line pt-2.5 text-[13px] text-muted">
            {d.beds ? <span>{d.beds} Beds</span> : null}
            {d.baths ? <span>{d.baths} Bathrooms</span> : null}
            {d.area ? <span>{d.area}</span> : null}
          </div>
        ) : null}
      </div>
    </>
  );

  return d.href ? (
    <Link href={d.href} prefetch={false} className="group flex flex-col overflow-hidden rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line bg-white shadow-[var(--shadow-card)]">{body}</Link>
  ) : (
    <div className="group flex flex-col overflow-hidden rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line bg-white shadow-[var(--shadow-card)]">{body}</div>
  );
}
