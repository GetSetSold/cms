"use client";
import { useRef, useState } from "react";
import { ListingCard } from "@/components/listings/ListingCard";
import type { GridListing } from "@/lib/mls";

const INITIAL_MOBILE = 4;

/** Similar listings: horizontal scroll with arrows on desktop, load-more on mobile. */
export function SimilarListings({ listings }: { listings: GridListing[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(INITIAL_MOBILE);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className="mt-12">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-2xl">Similar listings</h2>
        <div className="hidden gap-2 lg:flex">
          <a
            href="/listings"
            target="_blank"
            rel="noopener"
            className="mr-1 flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-semibold text-ink transition hover:bg-soft"
          >
            Search All Listings
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          </a>
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Scroll left"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink transition hover:bg-soft"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Scroll right"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink transition hover:bg-soft"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Desktop: horizontal scroll */}
      <div
        ref={scrollRef}
        className="hidden overflow-x-auto pb-2 lg:flex lg:snap-x"
        style={{ scrollbarWidth: "none", gap: "max(20px, calc((100% - 1120px) / 3))" }}
      >
        {listings.map((l) => (
          <div key={l.ListingKey} className="w-[280px] shrink-0 snap-start">
            <ListingCard listing={l} />
          </div>
        ))}
      </div>

      {/* Mobile: grid with load more */}
      <div className="lg:hidden">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {listings.slice(0, visible).map((l) => (
            <ListingCard key={l.ListingKey} listing={l} />
          ))}
        </div>
        <div className="mt-6 flex justify-center gap-3">
          {visible < listings.length ? (
            <button
              type="button"
              onClick={() => setVisible((v) => v + 4)}
              className="rounded-full border border-line bg-white px-6 py-2.5 text-[14px] font-semibold text-ink shadow-sm transition hover:bg-soft"
            >
              Load more
            </button>
          ) : null}
          <a
            href="/listings"
            target="_blank"
            rel="noopener"
            className="flex items-center gap-1.5 rounded-full border border-line bg-white px-6 py-2.5 text-[14px] font-semibold text-ink shadow-sm transition hover:bg-soft"
          >
            Search All Listings
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
