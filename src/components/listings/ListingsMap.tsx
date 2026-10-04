"use client";
import { useEffect, useRef } from "react";
import type { GridListing } from "@/lib/mls";
import { isSale, listingSlug } from "@/lib/mls";

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

/** Compact price for map pins: $450K, $2.5K, $1.5M */
function shortPrice(l: GridListing): string {
  const n = isSale(l) ? l.ListPrice : l.TotalActualRent;
  if (n == null) return "—";
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `$${Number(v.toFixed(1))}M`;
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    return `$${Number(v.toFixed(1))}K`;
  }
  return `$${n.toLocaleString()}`;
}

const ARROW_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M7 7h10v10"/></svg>`;

function cardHtml(l: GridListing): string {
  const href = `/real-estate/${encodeURIComponent(l.ListingKey)}/${listingSlug(l)}`;
  const img = l.Media
    ? `<img src="${l.Media}" alt="" style="width:100%;height:130px;object-fit:cover;display:block;border-radius:0;" loading="lazy" />`
    : `<div style="width:100%;height:130px;background:#f1f1f4;display:flex;align-items:center;justify-content:center;color:#888;font-size:12px;">No photo</div>`;
  const specs = [
    l.BedroomsTotal != null ? `${l.BedroomsTotal} bed` : null,
    l.BathroomsTotalInteger != null ? `${l.BathroomsTotalInteger} bath` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const price = isSale(l)
    ? (l.ListPrice != null ? `$${l.ListPrice.toLocaleString()}` : "—")
    : (l.TotalActualRent != null ? `$${l.TotalActualRent.toLocaleString()}/mo` : "—");
  const sale = isSale(l);
  const badge = sale ? "For Sale" : "For Rent";
  const badgeBg = sale ? "#111" : "#0066CC";
  return `
    <a href="${href}" target="_blank" rel="noopener" style="display:block;width:230px;position:relative;background:#fff;text-decoration:none;color:inherit;font-family:Inter,sans-serif;border:0;border-radius:0;box-shadow:none;">
      ${img}
      <span style="position:absolute;top:8px;left:8px;background:${badgeBg};color:#fff;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:4px 8px;border-radius:4px;">${badge}</span>
      <div style="padding:10px 12px 12px;">
        <div style="font-weight:700;font-size:16px;color:#111;">${price}</div>
        ${specs ? `<div style="font-size:12px;color:#555;margin-top:3px;">${specs}</div>` : ""}
        <div style="font-size:12px;color:#333;margin-top:3px;padding-right:36px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${l.UnparsedAddress ?? ""}</div>
      </div>
      <span style="position:absolute;bottom:10px;right:10px;width:32px;height:32px;border-radius:999px;background:#f1f1f4;color:#111;display:flex;align-items:center;justify-content:center;">${ARROW_SVG}</span>
    </a>`;
}

/** Strip the default maplibre popup chrome for a borderless card. */
function popupCss(): string {
  return `<style>
    .gss-popup .maplibregl-popup-content{background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;padding:0!important;}
    .gss-popup .maplibregl-popup-tip{display:none!important;}
  </style>`;
}

export function ListingsMap({ listings }: { listings: GridListing[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const popupRef = useRef<any>(null);

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
        zoom: withCoords.length ? 12 : 8,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;

      const bounds = new maplibregl.LngLatBounds();
      withCoords.forEach((l) => {
        const sale = isSale(l);
        const el = document.createElement("button");
        el.type = "button";
        el.textContent = shortPrice(l);
        el.style.cssText = `display:inline-flex;align-items:center;height:28px;padding:0 10px;border:0;border-radius:999px;background:${sale ? "#111" : "#0066CC"};color:#fff;font:700 12px Inter,sans-serif;box-shadow:0 2px 8px rgba(20,20,43,.25);white-space:nowrap;cursor:pointer;`;
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          popupRef.current?.remove();
          popupRef.current = new maplibregl.Popup({ offset: 12, closeButton: false, maxWidth: "250px", className: "gss-popup" })
            .setLngLat([l.Longitude, l.Latitude])
            .setHTML(popupCss() + cardHtml(l))
            .addTo(map);
        });
        const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([l.Longitude, l.Latitude])
          .addTo(map);
        markersRef.current.push(marker);
        bounds.extend([l.Longitude!, l.Latitude!]);
      });
      // Keep the zoom tight on the listing cluster
      if (withCoords.length > 1) map.fitBounds(bounds, { padding: 40, maxZoom: 15 });
      else if (withCoords.length === 1) map.setZoom(14);
    });
    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings]);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      const params = new URLSearchParams(window.location.search);
      params.set("lat", latitude.toFixed(6));
      params.set("lng", longitude.toFixed(6));
      params.delete("city");
      params.delete("page");
      // Preserve view (map/split/grid) for the reload
      window.location.href = `/listings?${params.toString()}`;
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
