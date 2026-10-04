"use client";

import { useEffect, useRef } from "react";

/**
 * AdSense ad card for listing grids — same footprint as a ListingCard.
 * Parses data-ad-client / data-ad-slot from the pasted AdSense snippet,
 * loads the AdSense script once, and triggers the ad on mount.
 */
export function AdCard({ code }: { code: string }) {
  const ref = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  // Extract AdSense params from the pasted snippet
  const client = code.match(/data-ad-client\s*=\s*["']([^"']+)["']/)?.[1];
  const slot = code.match(/data-ad-slot\s*=\s*["']([^"']+)["']/)?.[1];

  useEffect(() => {
    if (!client || !slot || pushed.current) return;
    pushed.current = true;

    // Load AdSense script once
    const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    if (!document.querySelector(`script[src="${src}"]`)) {
      const s = document.createElement("script");
      s.async = true;
      s.src = src;
      s.crossOrigin = "anonymous";
      document.head.appendChild(s);
    }

    // Trigger the ad after the ins element is in the DOM
    const t = setTimeout(() => {
      try {
        const w = window as unknown as { adsbygoogle?: unknown[] };
        w.adsbygoogle = w.adsbygoogle || [];
        w.adsbygoogle.push({});
      } catch {
        /* AdSense blocked or failed — leave the placeholder */
      }
    }, 100);
    return () => clearTimeout(t);
  }, [client, slot]);

  if (!client || !slot) return null;

  return (
    <div className="relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line bg-white shadow-[var(--shadow-card)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-soft">
        <ins
          ref={ref}
          className="adsbygoogle absolute inset-0"
          style={{ display: "block", width: "100%", height: "100%" }}
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
        <span className="absolute left-3 top-3 rounded bg-black/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white">
          Ad
        </span>
      </div>
      <div className="flex flex-1 items-center justify-center p-4">
        <span className="text-xs text-muted">Advertisement</span>
      </div>
    </div>
  );
}
