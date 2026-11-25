"use client";
/**
 * First-party visitor tracking for Admin → Visitors (the SalesIQ LiveView
 * replacement). Records one row per page view in public.visitor_events:
 * session id (per browser tab session), path, referrer + UTM source on the
 * landing view, and device class. No names or contact details — a session
 * is only tied to a person if they later become a lead. Skips staff areas.
 */
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"];

export function VisitorTracker() {
  const pathname = usePathname();
  const landed = useRef(false);

  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/login") || pathname.startsWith("/builder")) return;
    try {
      let sid = sessionStorage.getItem("gss_sid");
      if (!sid) {
        sid = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);
        sessionStorage.setItem("gss_sid", sid);
      }
      const first = !landed.current;
      landed.current = true;
      const params = new URLSearchParams(window.location.search);
      const utm = Object.fromEntries(UTM_KEYS.map((k) => [k, params.get(k)]));
      const body = JSON.stringify({
        session_id: sid,
        path: pathname,
        referrer: first ? document.referrer || null : null,
        utm_source: first ? utm.utm_source : null,
        utm_medium: first ? utm.utm_medium : null,
        utm_campaign: first ? utm.utm_campaign : null,
        device: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "mobile" : "desktop",
        user_agent: navigator.userAgent.slice(0, 300),
      });
      // Posted to our own /api/track route (not Supabase directly) so the
      // server can stamp the visitor's city / region / country from
      // Cloudflare's connection data before saving the row.
      void fetch("/api/track", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body,
      }).catch(() => null);
    } catch {
      // Tracking must never break the page.
    }
  }, [pathname]);

  return null;
}
