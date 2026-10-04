"use client";

import { useEffect, useRef } from "react";

/**
 * Responsive AdSense slot for guides pages, theme-styled as a white card.
 * Fed by the site's Ads settings code (grid_ad_code); rendered only when
 * the caller decides the guides_ad_enabled toggle is on.
 */
export function GuideAdSlot({ adCode, className = "" }: { adCode: string; className?: string }) {
  const ref = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  const client = adCode.match(/data-ad-client="([^"]+)"/)?.[1];
  const slot = adCode.match(/data-ad-slot="([^"]+)"/)?.[1];

  useEffect(() => {
    if (!client || !slot || pushed.current) return;
    pushed.current = true;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch {
      /* ad blocker */
    }
  }, [client, slot]);

  if (!client || !slot) return null;

  return (
    <div className={`rounded-xl border border-line bg-white p-4 text-center shadow-sm ${className}`}>
      <div className="mb-1.5">
        <span className="text-[8px] uppercase tracking-wider text-neutral-400">Advertisement</span>
      </div>
      <ins
        ref={ref}
        className="adsbygoogle mx-auto block"
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
