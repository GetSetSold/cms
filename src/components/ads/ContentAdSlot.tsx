"use client";

import { useEffect, useRef } from "react";

/**
 * Generic responsive AdSense slot fed by the site's Ads settings snippet.
 * Used on calculator + guide pages (toggles: calculators_ad_enabled, guides_ad_enabled).
 */
export function ContentAdSlot({ adCode, className = "" }: { adCode: string; className?: string }) {
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
        w.adsbygoogle.push({});
      } catch {
        /* ad blocker */
      }
    }, 100);
    return () => clearTimeout(t);
  }, [client, slot]);

  if (!client || !slot) return null;

  return (
    <div className={`rounded-[var(--radius-lg)] border border-line bg-white p-4 shadow-[var(--shadow-card)] ${className}`}>
      <div className="mb-2 text-center">
        <span className="text-[10px] uppercase tracking-wider text-muted">Advertisement</span>
      </div>
      <ins
        className="adsbygoogle mx-auto block"
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
