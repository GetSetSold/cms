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
        ((window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle =
          (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle || [];
        ((window as unknown as { adsbygoogle: unknown[] }).adsbygoogle).push({});
      } catch {
        /* AdSense blocked or failed — leave the placeholder */
      }
    }, 100);
    return () => clearTimeout(t);
  }, [client, slot]);

  if (!client || !slot) return null;

  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex min-h-[280px] flex-1 items-center justify-center p-4">
        <ins
          ref={ref}
          className="adsbygoogle"
          style={{ display: "block", width: "100%", minHeight: 250 }}
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
      <div className="border-t border-line px-4 py-2">
        <span className="text-[10px] uppercase tracking-wide text-muted">Advertisement</span>
      </div>
    </div>
  );
}
