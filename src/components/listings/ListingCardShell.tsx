import Link from "next/link";
import { CardArrowButton } from "@/components/site/CardArrowButton";
import { daysOnMarket } from "@/lib/mls";

export type ListingCardData = {
  href?: string;
  image: string | null;
  /** Bottom-left ribbon over the photo — "For Sale"/"For Rent" (our style),
   *  "Sold"/"Leased"/"Purchased" on history, "Pre-Con" etc. */
  statusLabel: string;
  statusTone: "dark" | "accent" | "green" | "blue" | "purple";
  price: string;
  address: string;
  city?: string | null;
  province?: string | null;
  beds?: number | null;
  baths?: number | null;
  area?: string | null; // pre-formatted, e.g. "1,507 m²" — caller decides the unit
  /** Public MLS® number (DDF ListingId, e.g. "X13810380"). Optional until the
   *  grid backfill lands. */
  mlsNumber?: string | null;
  /** Listing brokerage (OfficeName). */
  brokerage?: string | null;
  /** Days on market — computed from OriginalEntryTimestamp by the caller. */
  listedDays?: number | null;
  showFavorite?: boolean;
};

const TONE: Record<ListingCardData["statusTone"], string> = {
  dark: "bg-ink", accent: "bg-accent", green: "bg-[#1B8A5A]", blue: "bg-[#2B3A8C]", purple: "bg-primary",
};

function daysLabel(days: number | null | undefined): string | null {
  if (days == null || days < 0) return null;
  if (days === 0) return "New";
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function ListingCardShell(d: ListingCardData) {
  const specs = [
    d.beds != null ? `${d.beds} bed${d.beds === 1 ? "" : "s"}` : null,
    d.baths != null ? `${d.baths} bath${d.baths === 1 ? "" : "s"}` : null,
    d.area,
  ].filter(Boolean);

  const location = [d.address, d.city, d.province].filter(Boolean).join(", ");
  const days = daysLabel(d.listedDays);

  const body = (
    <>
      <div className="relative aspect-[4/3] overflow-hidden bg-soft">
        {d.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.image} alt="" className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">No photo</div>
        )}
        <span className={`absolute bottom-3 left-3 rounded px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white ${TONE[d.statusTone]}`}>
          {d.statusLabel}
        </span>
        {days ? (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/75 px-3 py-1 text-[11px] font-semibold text-white">
            {days}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[22px] font-bold leading-tight text-ink">{d.price}</div>
          {d.showFavorite ? (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center text-ink" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 20s-7-4.35-9.5-8.5C.7 8.1 2.4 4.5 6 4.5c2 0 3.4 1.1 6 3.5 2.6-2.4 4-3.5 6-3.5 3.6 0 5.3 3.6 3.5 7C19 15.65 12 20 12 20z" />
              </svg>
            </span>
          ) : null}
        </div>

        {specs.length > 0 ? (
          <div className="text-[15px] text-ink">{specs.join("  ")}</div>
        ) : null}

        {location ? (
          <div className="truncate text-[15px] text-ink">{location}</div>
        ) : null}

        {d.mlsNumber || d.brokerage ? (
          <div className="truncate pr-10 text-[13px] text-muted">
            {d.mlsNumber ? `MLS® ${d.mlsNumber}` : null}
            {d.mlsNumber && d.brokerage ? " • " : null}
            {d.brokerage ? d.brokerage : null}
          </div>
        ) : null}
      </div>
    </>
  );

  return d.href ? (
    <Link href={d.href} prefetch={false} className="group relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line bg-white shadow-[var(--shadow-card)]">
      {body}
      <CardArrowButton />
    </Link>
  ) : (
    <div className="group relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line bg-white shadow-[var(--shadow-card)]">
      {body}
    </div>
  );
}

/** Helper for callers: compute listedDays from a DDF timestamp. */
export { daysOnMarket };
