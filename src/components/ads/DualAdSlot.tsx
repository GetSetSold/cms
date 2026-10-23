"use client";

import { useEffect, useRef } from "react";

/**
 * Dual square AdSense slot — two 300x250/336x280 units side by side on desktop,
 * stacked on mobile. For wide placements where a single stretched responsive ad
 * looks empty. Each unit is capped at 336px so Google serves square creatives
 * that fit the framed area on any screen.
 */
export function DualAdSlot({ adCode, className = "" }: { adCode: string; className?: string }) {
  const pushed = useRef(false);

  const client = adCode.match(/data-ad-client\s*=\s*["']([^"']+)["']/)?.[1];
  const slot = adCode.match(/data-ad-slot\s*=\s*["']([^"']+)["']/)?.[1];

  useEffect(() => {
    if (!client || !slot || pushed.current) return;
    pushed.current = true;
    const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    if (!document.querySelector(`script[src="${src}"]`)) {
      const s = document.createElement("script");
      s.async = true;
      s.src = src;
      s.crossOrigin = "anonymous";
      document.head.appendChild(s);
    }
    const t = setTimeout(() => {
      try {
        const w = window as unknown as { adsbygoogle?: unknown[] };
        w.adsbygoogle = w.adsbygoogle || [];
        // Push once per unit
        w.adsbygoogle.push({});
        w.adsbygoogle.push({});
      } catch {
        /* ad blocker */
      }
    }, 100);
    return () => clearTimeout(t);
  }, [client, slot]);

  if (!client || !slot) return null;

  return (
    <div className={`rounded-[var(--radius-lg)] bg-white p-4 ${className}`}>
      <div className="mb-2 text-center">
        <span className="text-[10px] uppercase tracking-wider text-muted">Advertisement</span>
      </div>
      <div className="flex flex-col items-center justify-center gap-4 md:flex-row">
        {[0, 1].map((i) => (
          <ins
            key={i}
            className="adsbygoogle block"
            style={{ display: "block", width: "100%", maxWidth: "336px", minHeight: "250px" }}
            data-ad-client={client}
            data-ad-slot={slot}
            data-ad-format="auto"
            data-full-width-responsive="false"
          />
        ))}
      </div>
    </div>
  );
}
