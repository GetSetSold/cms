"use client";
import type { PropertyListing } from "@/lib/mls";

/** Small banner under the agent card (For Sale only). Opens affordability calculator in a new tab. */
export function AffordabilityBanner({ listing }: { listing: PropertyListing }) {
  const key = String(listing.ListingKey ?? "");

  return (
    <a
      href={`/calculators/affordability-calculator${key ? `?mls=${encodeURIComponent(key)}` : ""}`}
      target="_blank"
      rel="noopener"
      className="card group flex w-full items-center gap-3 p-4 text-left transition-shadow hover:shadow-md"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-white">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <line x1="8" y1="6" x2="16" y2="6" />
          <line x1="8" y1="11" x2="8" y2="11.01" />
          <line x1="12" y1="11" x2="12" y2="11.01" />
          <line x1="16" y1="11" x2="16" y2="11.01" />
          <line x1="8" y1="15" x2="8" y2="15.01" />
          <line x1="12" y1="15" x2="12" y2="15.01" />
          <line x1="16" y1="15" x2="16" y2="15.01" />
          <line x1="8" y1="19" x2="8" y2="19.01" />
          <line x1="12" y1="19" x2="12" y2="19.01" />
          <line x1="16" y1="19" x2="16" y2="19.01" />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold leading-tight">Can you afford this home?</span>
        <span className="block text-[12px] text-muted leading-tight">Free affordability calculator</span>
      </span>
      <span className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-soft text-ink transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="7" y1="17" x2="17" y2="7" />
          <polyline points="7 7 17 7 17 17" />
        </svg>
      </span>
    </a>
  );
}
