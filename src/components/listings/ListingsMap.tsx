"use client";
import { useEffect, useRef } from "react";
import type { GridListing } from "@/lib/mls";
import { priceDisplay } from "@/lib/mls";

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

export function ListingsMap({ listings }: { listings: GridListing[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadMaplibre().then(() => {
      if (cancelled || !containerRef.current) return;
      const maplibregl = window.maplibregl;
      const withCoords = listings.filter((l) => l.Latitude && l.Longitude);
      const center = withCoords[0] ? [withCoords[0].Longitude, withCoords[0].Latitude] : [-79.38, 43.65];

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: `https://api.maptiler.com/maps/streets-v4/style.json?key=${MAPTILER_KEY}`,
        center,
        zoom: withCoords.length ? 11 : 8,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;

      const bounds = new maplibregl.LngLatBounds();
      withCoords.forEach((l) => {
        const el = document.createElement("a");
        el.href = `/listings/${encodeURIComponent(l.ListingKey)}`;
        el.textContent = priceDisplay(l).replace("/mo", "");
        el.style.cssText = "display:inline-flex;align-items:center;height:30px;padding:0 10px;border-radius:999px;background:#fff;color:var(--c-ink);font:600 12px Inter,sans-serif;box-shadow:0 2px 8px rgba(20,20,43,.18);white-space:nowrap;text-decoration:none;";
        const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([l.Longitude, l.Latitude])
          .addTo(map);
        markersRef.current.push(marker);
        bounds.extend([l.Longitude!, l.Latitude!]);
      });
      if (withCoords.length > 1) map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
    });
    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.remove());
      mapRef.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings]);

  function useMyLocation() {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      mapRef.current.flyTo({ center: [longitude, latitude], zoom: 13 });
      const live = getComputedStyle(mapRef.current.getContainer()).getPropertyValue("--c-primary").trim();
      new window.maplibregl.Marker({ color: live || "#6C5DD3" }).setLngLat([longitude, latitude]).addTo(mapRef.current);
    });
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl">
      <div ref={containerRef} className="h-full w-full" />
      <button onClick={useMyLocation} type="button"
        className="absolute bottom-4 left-4 flex h-10 items-center gap-2 rounded-full bg-white px-3.5 text-sm font-medium shadow-md">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
        My location
      </button>
    </div>
  );
}
