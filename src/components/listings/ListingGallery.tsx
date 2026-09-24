"use client";
import { useState } from "react";
import type { MediaItem } from "@/lib/mls";

export function ListingGallery({ items }: { items: MediaItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!items.length) {
    return <div className="flex h-72 items-center justify-center rounded-2xl bg-soft text-muted">No photos available</div>;
  }
  const [hero, ...rest] = items;
  const visible = rest.slice(0, 4);
  const overflow = items.length > 5 ? items.length - 5 : 0;

  return (
    <>
      <div className="grid h-[300px] grid-cols-1 gap-2.5 overflow-hidden rounded-2xl md:h-[460px] md:grid-cols-[1.6fr_1fr]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <button onClick={() => setOpen(0)} className="block h-full w-full cursor-zoom-in">
          <img src={hero.MediaURL} alt={hero.Caption ?? ""} className="h-full w-full object-cover" />
        </button>
        <div className="hidden grid-cols-2 grid-rows-2 gap-2.5 md:grid">
          {visible.map((m, i) => {
            const isLast = i === visible.length - 1;
            return (
              <button key={i} onClick={() => setOpen(i + 1)} className="relative block h-full w-full cursor-zoom-in overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.MediaURL} alt={m.Caption ?? ""} className="h-full w-full object-cover" />
                {isLast && overflow ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white">+{overflow} more</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
      {open !== null ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/90 p-4" onClick={() => setOpen(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={items[open].MediaURL} alt={items[open].Caption ?? ""} className="max-h-[80vh] max-w-full rounded-lg object-contain" />
          <div className="flex items-center gap-4 text-white">
            <button onClick={(e) => { e.stopPropagation(); setOpen((open - 1 + items.length) % items.length); }} className="rounded-full bg-white/15 px-4 py-2">Prev</button>
            <span>{open + 1} / {items.length}</span>
            <button onClick={(e) => { e.stopPropagation(); setOpen((open + 1) % items.length); }} className="rounded-full bg-white/15 px-4 py-2">Next</button>
            <button onClick={() => setOpen(null)} className="ml-4 rounded-full bg-white/15 px-4 py-2">Close</button>
          </div>
        </div>
      ) : null}
    </>
  );
}
