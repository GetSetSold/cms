"use client";

import { Children, useRef } from "react";

/** Horizontal swipe row for card pages (pages containing a digital_card).
 *  Native finger-swipe on mobile (scroll-snap, peek of the next card);
 *  arrow buttons scroll one card on desktop. Children are wrapped at a
 *  fixed card width so the row never squeezes into a grid. */
export function SwipeRow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    ref.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  };
  return (
    <div>
      <div className="mb-3 flex justify-end gap-2">
        <button
          type="button"
          aria-label="Previous"
          onClick={() => scroll(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-btn)] border border-line bg-white text-xl text-ink shadow-[var(--shadow-card)]"
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="Next"
          onClick={() => scroll(1)}
          className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-btn)] border border-line bg-white text-xl text-ink shadow-[var(--shadow-card)]"
        >
          ›
        </button>
      </div>
      <div
        ref={ref}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {Children.map(children, (child) => (
          <div className="w-[280px] shrink-0 snap-start">{child}</div>
        ))}
      </div>
    </div>
  );
}
