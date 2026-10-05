"use client";
import { useState } from "react";

/**
 * Card with collapsible content on mobile.
 * Desktop (lg+): always expanded, static heading.
 * Mobile: collapsed by default, +/- toggle in heading.
 */
export function CollapsibleCard({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-line bg-white last:border-b-0 lg:overflow-hidden lg:rounded-2xl lg:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 border-b border-line px-6 py-4 text-left lg:cursor-default"
      >
        <span className="font-display !text-left text-[1.0rem]">{title}</span>
        <span
          aria-hidden="true"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-lg leading-none text-ink lg:hidden"
        >
          {open ? "−" : "+"}
        </span>
      </button>
      <div className={open ? "block" : "hidden lg:block"}>
        {children}
      </div>
    </div>
  );
}
