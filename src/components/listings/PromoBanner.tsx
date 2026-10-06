"use client";
import type { PropertyListing } from "@/lib/mls";

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

function money(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-CA");
}

/**
 * Promo banner — Style 1 (Black Promo).
 * Buyer: cashback offer on For Sale. Tenant: free rental service on For Rent.
 * Placed in the left panel before the ad slot. Cities controlled via settings.
 */
export function PromoBanner({
  variant,
  listing,
}: {
  variant: "buyer" | "tenant";
  listing: PropertyListing;
}) {
  const price = Number(listing.ListPrice ?? 0);
  const address = listing.UnparsedAddress ?? "";
  const city = listing.City ?? "";

  const openInquiry = () => {
    window.dispatchEvent(new CustomEvent("open-inquiry"));
  };

  if (variant === "buyer") {
    // 0.25% cashback, matching the $599K → $1,497.50 example.
    const cashback = Math.round(price * 0.0025);
    return (
      <div className="flex flex-col gap-5 rounded-[var(--radius-lg)] bg-ink p-6 text-white md:flex-row md:items-center md:gap-6 md:p-7">
        <div className="min-w-0 flex-1">
          <span className="mb-3 inline-block rounded-full bg-white px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[1.5px] text-ink">
            Exclusive Buyer Offer
          </span>
          <h3 className="font-display text-2xl font-extrabold tracking-tight">
            Get {money(cashback)} Cash Back
          </h3>
          <p className="mt-2 text-[14px] leading-relaxed text-white/60">
            <strong className="text-white">{address}</strong>
            {city ? <>, {city}</> : null} — listed at{" "}
            <strong className="text-white">{money(price)}</strong>. Earn buyer
            cashback at closing. No catches, just more money in your pocket.
          </p>
        </div>
        <div className="flex shrink-0 justify-end md:justify-start">
          <button
            type="button"
            onClick={openInquiry}
            className="group inline-flex items-center gap-2.5 rounded-[var(--radius-md)] bg-white px-5 py-3 text-[14px] font-bold text-ink"
          >
            Claim Offer
            <span className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <ArrowIcon />
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-[var(--radius-lg)] bg-ink p-6 text-white md:flex-row md:items-center md:gap-6 md:p-7">
      <div className="min-w-0 flex-1">
        <span className="mb-3 inline-block rounded-full bg-accent px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[1.5px] text-white">
          Renter-Friendly Service
        </span>
        <h3 className="font-display text-2xl font-extrabold tracking-tight">
          Free Rental Service
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-white/60">
          <strong className="text-white">{address}</strong>
          {city ? <>, {city}</> : null} — available at{" "}
          <strong className="text-white">{money(price)}/mo</strong>. Streamlined
          process, move in quickly. 100% free for tenants — we handle everything.
        </p>
      </div>
      <div className="flex shrink-0 justify-end md:justify-start">
        <button
          type="button"
          onClick={openInquiry}
          className="group inline-flex items-center gap-2.5 rounded-[var(--radius-md)] bg-accent px-5 py-3 text-[14px] font-bold text-white"
        >
          Apply Now
          <span className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
            <ArrowIcon />
          </span>
        </button>
      </div>
    </div>
  );
}
