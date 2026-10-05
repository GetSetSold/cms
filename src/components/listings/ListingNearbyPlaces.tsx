"use client";
import { useEffect, useRef, useState } from "react";
import { getCachedPois } from "./ListingDetailMap";

type Poi = { name: string; lat: number; lng: number; cls: string; subclass: string };
type Place = { name: string; distanceKm: number };
type CategoryResult = { label: string; places: Place[] };

// Match against OSM `class`/`subclass` from vector tiles (free, comprehensive).
const CATEGORIES: { label: string; match: (p: Poi) => boolean }[] = [
  { label: "Schools", match: (p) => p.subclass === "school" || p.cls === "education" },
  {
    label: "Groceries",
    match: (p) =>
      ["supermarket", "grocery", "convenience", "marketplace"].includes(p.subclass) ||
      (p.cls === "shop" && /market|grocery|supermarket/i.test(p.subclass)),
  },
  {
    label: "Restaurants",
    match: (p) =>
      ["restaurant", "cafe", "fast_food", "bar", "pub", "food_court"].includes(p.subclass),
  },
  {
    label: "Pharmacy & Health",
    match: (p) =>
      ["pharmacy", "clinic", "hospital", "doctors", "dentist"].includes(p.subclass) ||
      p.cls === "healthcare",
  },
  {
    label: "Transit",
    match: (p) =>
      ["bus_stop", "bus_station", "station", "halt"].includes(p.subclass) ||
      p.cls === "railway" ||
      p.cls === "public_transport",
  },
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

function fmtDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

/**
 * Nearby places from the map's vector tiles (free: zero extra API calls).
 * POIs are queried from the already-loaded map tiles once they render.
 */
export function ListingNearbyPlaces({ lat, lng, listingKey }: { lat: number; lng: number; listingKey: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<CategoryResult[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    const build = (pois: Poi[]) => {
      const withDist = pois
        .map((p) => ({ ...p, distanceKm: haversineKm(lat, lng, p.lat, p.lng) }))
        .sort((a, b) => a.distanceKm - b.distanceKm);
      const out: CategoryResult[] = CATEGORIES.map((cat) => {
        const seen = new Set<string>();
        const places: Place[] = [];
        for (const p of withDist) {
          if (!cat.match(p)) continue;
          const key = p.name.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          places.push({ name: p.name, distanceKm: p.distanceKm });
          if (places.length >= 5) break;
        }
        return { label: cat.label, places };
      });
      if (!cancelled) setResults(out);
    };

    // POIs may already be cached if the map loaded first.
    const cached = getCachedPois(listingKey);
    if (cached && cached.length) {
      build(cached);
      return () => { cancelled = true; };
    }

    // Otherwise wait for the map to emit them (only when scrolled near).
    let io: IntersectionObserver | null = null;
    const onPois = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.key === listingKey && Array.isArray(detail.pois)) {
        build(detail.pois);
        cleanup();
      }
    };
    const cleanup = () => {
      window.removeEventListener("listing-pois", onPois);
      io?.disconnect();
    };
    const el = ref.current;
    if (el) {
      io = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            // Section is visible; start listening (map likely already loaded).
            window.addEventListener("listing-pois", onPois);
            const again = getCachedPois(listingKey);
            if (again && again.length) {
              build(again);
              cleanup();
            }
          }
        },
        { rootMargin: "300px" }
      );
      io.observe(el);
    } else {
      window.addEventListener("listing-pois", onPois);
    }
    return () => { cancelled = true; cleanup(); };
  }, [lat, lng, listingKey]);

  const visible = (results ?? []).filter((r) => r.places.length > 0);
  if (results && visible.length === 0) return null;

  return (
    <div ref={ref} className="overflow-hidden rounded-2xl bg-white">
      <h2 className="border-b border-line px-6 py-4 font-display !text-left text-[1.0rem]">Nearby Places</h2>
      <div className="px-6 py-5">
        {!results ? (
          <p className="text-[0.85rem] text-gray-400">Loading nearby places…</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((r) => (
                <div key={r.label} className="rounded-xl border border-line p-4">
                  <p className="mb-2 text-[0.85rem] font-semibold">{r.label}</p>
                  <ul className="divide-y divide-line/60">
                    {r.places.map((p, i) => (
                      <li key={i} className="flex items-baseline justify-between gap-3 py-1.5 text-[0.85rem]">
                        <span className="break-words">{p.name}</span>
                        <span className="shrink-0 text-gray-500">{fmtDist(p.distanceKm)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[0.75rem] text-gray-400">Distances are approximate, measured from the listing location.</p>
          </>
        )}
      </div>
    </div>
  );
}
