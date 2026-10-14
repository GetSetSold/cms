"use client";

import { useEffect, useRef } from "react";

/**
 * AdSense ad slot for blog sidebar — vertical format.
 * Parses data-ad-client / data-ad-slot from the pasted AdSense snippet,
 * loads the AdSense script once, and triggers the ad on mount.
 */
export function BlogAdSlot({ code }: { code: string }) {
  const ref = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  const client = code.match(/data-ad-client\s*=\s*["']([^"']+)["']/)?.[1];
  const slot = code.match(/data-ad-slot\s*=\s*["']([^"']+)["']/)?.[1];

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
        /* AdSense blocked or failed — leave the placeholder */
      }
    }, 100);
    return () => clearTimeout(t);
  }, [client, slot]);

  if (!client || !slot) return null;

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] bg-white p-4 shadow-[var(--shadow-card)]">
      <span className="mb-2 block text-[10px] uppercase tracking-wide text-muted">Advertisement</span>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
