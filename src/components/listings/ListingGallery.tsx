"use client";
import { useEffect, useRef, useState } from "react";
import type { MediaItem } from "@/lib/mls";

export function ListingGallery({ items }: { items: MediaItem[] }) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);

  const openGallery = (i: number) => {
    setStartIndex(i);
    setGalleryOpen(true);
  };

  useEffect(() => {
    if (!galleryOpen) return;
    imgRefs.current[startIndex]?.scrollIntoView({ block: "start" });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGalleryOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [galleryOpen, startIndex]);

  if (!items.length) {
    return <div className="flex h-72 items-center justify-center rounded-2xl bg-soft text-muted">No photos available</div>;
  }
  const [hero, ...rest] = items;
  const visible = rest.slice(0, 4);
  const overflow = items.length > 5 ? items.length - 5 : 0;

  return (
    <>
      <div className="grid h-[300px] grid-cols-1 gap-2.5 overflow-hidden rounded-2xl md:h-[460px] md:grid-cols-[1.6fr_1fr]">
        <div className="relative h-full w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <button onClick={() => openGallery(0)} className="block h-full w-full cursor-zoom-in">
            <img src={hero.MediaURL} alt={hero.Caption ?? ""} className="h-full w-full object-cover" />
          </button>
          <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/75 px-2.5 py-1 text-[11px] font-semibold text-white">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            {items.length}
          </span>
          <button
            onClick={() => openGallery(0)}
            className="absolute bottom-5 right-3 flex items-center gap-1.5 rounded-full bg-black/75 px-3.5 py-2 text-[12px] font-semibold text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            View Gallery
          </button>
        </div>
        <div className="hidden grid-cols-2 grid-rows-2 gap-2.5 md:grid">
          {visible.map((m, i) => {
            const isLast = i === visible.length - 1;
            return (
              <button key={i} onClick={() => openGallery(i + 1)} className="relative block h-full w-full cursor-zoom-in overflow-hidden rounded-xl">
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
      {galleryOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={() => setGalleryOpen(false)}>
          <div className="flex shrink-0 items-center justify-between px-4 py-3 text-white">
            <span className="text-sm font-semibold">{items.length} Photos</span>
            <button onClick={() => setGalleryOpen(false)} className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
              Close
            </button>
          </div>
          <div className="flex flex-col items-center gap-4 overflow-y-auto px-4 pb-10" onClick={(e) => e.stopPropagation()}>
            {items.map((m, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                ref={(el) => {
                  imgRefs.current[i] = el;
                }}
                src={m.MediaURL}
                alt={m.Caption ?? `Photo ${i + 1}`}
                className="max-h-[80vh] w-auto max-w-full rounded-lg object-contain"
                loading={i < 3 ? "eager" : "lazy"}
              />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
