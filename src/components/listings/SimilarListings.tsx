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
        className="hidden gap-5 overflow-x-auto pb-2 lg:flex lg:snap-x"
        style={{ scrollbarWidth: "none" }}
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
        {visible < listings.length ? (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setVisible((v) => v + 4)}
              className="rounded-full border border-line bg-white px-6 py-2.5 text-[14px] font-semibold text-ink shadow-sm transition hover:bg-soft"
            >
              Load more
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
