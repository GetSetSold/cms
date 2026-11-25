"use client";
/**
 * First-party visitor tracking for Admin → Visitors (the SalesIQ LiveView
 * replacement). Posts to our own /api/track route, which stamps the
 * visitor's city / region / country from Cloudflare before saving:
 *  - a "view" per page view (history in visitor_events + live presence)
 *  - a "ping" every 20s while the tab is visible (keeps presence current)
 *  - a "leave" when the tab closes (presence removed)
 * No names or contact details — a session is only tied to a person if
 * they later become a lead. Skips staff areas.
 */
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"];
const STAFF = (p: string) => p.startsWith("/admin") || p.startsWith("/login") || p.startsWith("/builder");

function getSid(): string | null {
  try {
    let sid = sessionStorage.getItem("gss_sid");
    if (!sid) {
      sid = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);
      sessionStorage.setItem("gss_sid", sid);
    }
    return sid;
  } catch {
    return null;
  }
}

function post(payload: Record<string, unknown>) {
  void fetch("/api/track", {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => null);
}

export function VisitorTracker() {
  const pathname = usePathname();
  const landed = useRef(false);

  // Page views.
  useEffect(() => {
    if (STAFF(pathname)) return;
    const sid = getSid();
    if (!sid) return;
    try {
      const first = !landed.current;
      landed.current = true;
      const params = new URLSearchParams(window.location.search);
      const utm = Object.fromEntries(UTM_KEYS.map((k) => [k, params.get(k)]));
      post({
        type: "view",
        session_id: sid,
        path: pathname,
        referrer: first ? document.referrer || null : null,
        utm_source: first ? utm.utm_source : null,
        utm_medium: first ? utm.utm_medium : null,
        utm_campaign: first ? utm.utm_campaign : null,
        device: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "mobile" : "desktop",
        user_agent: navigator.userAgent.slice(0, 300),
      });
    } catch {
      // Tracking must never break the page.
    }
  }, [pathname]);

  // Heartbeat + leave signal (mounted once).
  useEffect(() => {
    const ping = () => {
      if (document.visibilityState !== "visible" || STAFF(window.location.pathname)) return;
      const sid = getSid();
      if (sid) post({ type: "ping", session_id: sid, path: window.location.pathname });
    };
    const leave = () => {
      const sid = getSid();
      if (sid) post({ type: "leave", session_id: sid });
    };
    const t = setInterval(ping, 20_000);
    window.addEventListener("pagehide", leave);
    return () => {
      clearInterval(t);
      window.removeEventListener("pagehide", leave);
    };
  }, []);

  return null;
}
