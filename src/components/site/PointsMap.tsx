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

export type MapPoint = { lat: number; lng: number; label: string; href: string };

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
        el.textContent = p.label;
        el.style.cssText = "display:inline-flex;align-items:center;height:30px;padding:0 10px;border-radius:999px;background:#fff;color:var(--c-ink);font:600 12px Inter,sans-serif;box-shadow:0 2px 8px rgba(20,20,43,.18);white-space:nowrap;text-decoration:none;max-width:200px;overflow:hidden;text-overflow:ellipsis;";
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
