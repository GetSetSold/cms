"use client";
import { useEffect, useRef } from "react";

const MAPTILER_KEY = "Zr8EXulAyt75JJibE0ol";

declare global {
  interface Window { maplibregl?: any }
}

function loadMaplibre(): Promise<void> {
  if (window.maplibregl) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";
    document.head.appendChild(css);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export type MapPoint = { lat: number; lng: number; label: string; href: string; logoUrl?: string | null };

export function PointsMap({ points }: { points: MapPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadMaplibre().then(() => {
      if (cancelled || !containerRef.current) return;
      const maplibregl = window.maplibregl;
      const center = points[0] ? [points[0].lng, points[0].lat] : [-79.38, 43.65];

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: `https://api.maptiler.com/maps/streets-v4/style.json?key=${MAPTILER_KEY}`,
        center,
        zoom: points.length ? 10 : 6,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;

      const bounds = new maplibregl.LngLatBounds();
      points.forEach((p) => {
        const el = document.createElement("a");
        el.href = p.href;
        el.title = p.label;
        el.style.cssText = "display:block;width:44px;height:56px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.35));text-decoration:none;";
        const inner = p.logoUrl
          ? `<clipPath id="pinclip"><circle cx="22" cy="18" r="10"/></clipPath><circle cx="22" cy="18" r="10" fill="#fff"/><image href="${p.logoUrl}" x="12" y="8" width="20" height="20" preserveAspectRatio="xMidYMid meet" clip-path="url(#pinclip)"/>`
          : `<text x="22" y="21" text-anchor="middle" fill="#fff" font-size="7" font-weight="700" font-family="Inter,sans-serif">${(p.label || "").slice(0, 10)}</text>`;
        el.innerHTML = `<svg viewBox="0 0 44 56" width="44" height="56" aria-hidden="true"><path d="M22 1C12.1 1 4 9.1 4 19c0 12.9 16.4 35.4 17.1 36.3a1.3 1.3 0 0 0 1.9 0C23.6 54.4 40 31.9 40 19 40 9.1 31.9 1 22 1z" fill="#111"/>${inner}</svg>`;
        const marker = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([p.lng, p.lat]).addTo(map);
        markersRef.current.push(marker);
        bounds.extend([p.lng, p.lat]);
      });
      if (points.length > 1) map.fitBounds(bounds, { padding: 60, maxZoom: 13 });
    });
    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.remove());
      mapRef.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  return <div ref={containerRef} className="h-full w-full" />;
}
