"use client";

import { useState } from "react";

/** Section toggle for card pages (pages containing a digital_card) —
 *  collapsed by default on ALL devices, with a + / − toggle in the
 *  heading. Deliberately NOT the listing-detail pattern (which expands
 *  on desktop): a card page is a one-screen card with optional sections
 *  underneath, so desktop and phone show the same short page. `extra`
 *  (e.g. a View all link) sits outside the toggle button so it stays
 *  tappable even while the section is closed.
 *  Heading size matches the shared h2Compact scale used on card pages. */
export function CardCollapsible({ title, extra, children }: { title: string; extra?: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex flex-1 items-start gap-3 text-left"
        >
          <span
            aria-hidden="true"
            className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-btn)] border border-line bg-white text-lg leading-none text-ink"
          >
            {open ? "−" : "+"}
          </span>
          <span className="font-display font-semibold tracking-tight text-[22px] leading-snug md:text-[32px]">{title}</span>
        </button>
        {extra}
      </div>
      <div className={open ? "block" : "hidden"}>{children}</div>
    </div>
  );
}
