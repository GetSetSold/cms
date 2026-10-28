"use client";

import { useState } from "react";

/** Section toggle for card pages (pages containing a digital_card) — the
 *  listing-detail pattern: collapsed by default on mobile with a + / −
 *  toggle in the heading, always expanded on desktop (lg+) where the
 *  toggle is hidden. `extra` (e.g. a View all link) sits outside the
 *  toggle button so it stays tappable even while the section is closed.
 *  Heading size matches the shared h2Compact scale used on card pages. */
export function CardCollapsible({ title, extra, children }: { title: string; extra?: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex flex-1 items-center justify-between gap-4 text-left lg:cursor-default"
        >
          <span className="font-display font-semibold tracking-tight text-[22px] leading-snug md:text-[32px]">{title}</span>
          <span
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-btn)] border border-line bg-white text-lg leading-none text-ink lg:hidden"
          >
            {open ? "−" : "+"}
          </span>
        </button>
        {extra}
      </div>
      <div className={open ? "block" : "hidden lg:block"}>{children}</div>
    </div>
  );
}
