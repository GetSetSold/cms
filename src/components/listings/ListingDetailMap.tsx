"use client";
import { useEffect, useRef } from "react";

const MAPTILER_KEY = "Zr8EXulAyt75JJibE0ol"; // same key the site's other maps use

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

/** Shared POI cache: map emits when tiles load, nearby block consumes. */
const poiCache = new Map<string, { name: string; lat: number; lng: number; cls: string; subclass: string }[]>();
export function getCachedPois(key: string) { return poiCache.get(key); }
function setCachedPois(key: string, pois: { name: string; lat: number; lng: number; cls: string; subclass: string }[]) {
  poiCache.set(key, pois);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("listing-pois", { detail: { key, pois } }));
  }
}

/** Single-pin interactive map for the listing detail page. */
export function ListingDetailMap({ lat, lng, label, listingKey }: { lat: number; lng: number; label: string; listingKey?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let map: any = null;
    loadMaplibre().then(() => {
      if (cancelled || !containerRef.current) return;
      const maplibregl = window.maplibregl;
      map = new maplibregl.Map({
        container: containerRef.current,
        style: `https://api.maptiler.com/maps/streets-v4/style.json?key=${MAPTILER_KEY}`,
        center: [lng, lat],
        zoom: 14,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      const el = document.createElement("div");
      el.title = label;
      el.innerHTML = `<svg width="38" height="38" viewBox="0 0 24 24" fill="#111111" stroke="#ffffff" stroke-width="1.5" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="#ffffff" stroke="none"/></svg>`;
      new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([lng, lat]).addTo(map);
      // Query POIs from the loaded vector tiles (free: no extra API calls,
      // uses tiles already fetched for the map). Real OSM categories.
      map.on("load", () => {
        if (cancelled) return;
        try {
          // Find the POI layer(s) in the style
          const style = map.getStyle();
          const poiLayers = (style.layers || [])
            .filter((l: any) => l["source-layer"] === "poi")
            .map((l: any) => l.id);
          if (!poiLayers.length || !listingKey) return;
          const feats = map.queryRenderedFeatures({ layers: poiLayers });
          const pois = feats
            .map((f: any) => ({
              name: String(f.properties?.name ?? "").trim(),
              lng: f.geometry?.coordinates?.[0],
              lat: f.geometry?.coordinates?.[1],
              cls: String(f.properties?.class ?? ""),
              subclass: String(f.properties?.subclass ?? ""),
            }))
            .filter((p: any) => p.name && Number.isFinite(p.lat) && Number.isFinite(p.lng));
          // De-dupe by name+location
          const seen = new Set<string>();
          const uniq = pois.filter((p: any) => {
            const k = `${p.name.toLowerCase()}|${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          });
          setCachedPois(listingKey, uniq);
        } catch { /* ignore */ }
      });
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lng, label, listingKey]);

  return <div ref={containerRef} className="h-72 w-full" aria-label={`Map of ${label}`} />;
}
