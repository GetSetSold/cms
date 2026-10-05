"use client";
import { useEffect, useRef, useState } from "react";

const MAPTILER_KEY = "Zr8EXulAyt75JJibE0ol"; // same key the site's other maps use

type Place = { name: string; distanceKm: number };
type CategoryResult = { label: string; places: Place[] };

const CATEGORIES = [
  { label: "Groceries", query: "grocery store" },
  { label: "Restaurants & Cafes", query: "restaurant" },
  { label: "Schools", query: "school" },
  { label: "Parks", query: "park" },
  { label: "Health", query: "pharmacy" },
  { label: "Shopping", query: "shopping mall" },
  { label: "Transit", query: "train station" },
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

/** Compact nearby-places block. Loads only when scrolled into view to avoid API cost. */
export function ListingNearbyPlaces({ lat, lng }: { lat: number; lng: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<CategoryResult[] | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    const load = async () => {
      const out = await Promise.all(
        CATEGORIES.map(async (cat) => {
          try {
            const url =
              `https://api.maptiler.com/geocoding/${encodeURIComponent(cat.query)}.json` +
              `?key=${MAPTILER_KEY}&proximity=${lng},${lat}&limit=5&types=poi`;
            const res = await fetch(url);
            if (!res.ok) return { label: cat.label, places: [] as Place[] };
            const data = await res.json();
            const places: Place[] = (data.features ?? [])
              .filter((f: any) => Array.isArray(f.center))
              .map((f: any) => ({
                name: String(f.place_name ?? f.text ?? "").split(",")[0].trim() || "Unknown",
                distanceKm: haversineKm(lat, lng, f.center[1], f.center[0]),
              }))
              .filter((p: Place) => p.name && p.distanceKm < 25)
              .sort((a: Place, b: Place) => a.distanceKm - b.distanceKm)
              .slice(0, 3);
            return { label: cat.label, places };
          } catch {
            return { label: cat.label, places: [] as Place[] };
          }
        })
      );
      if (!cancelled) setResults(out);
    };
    // Load only when scrolled near into view, so listings that aren't
    // scrolled to cost zero geocoding API calls.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          io.disconnect();
          load();
        }
      },
      { rootMargin: "300px" }
    );
    io.observe(el);
    return () => { cancelled = true; io.disconnect(); };
  }, [lat, lng]);

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
            <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
              {visible.map((r) => (
                <div key={r.label}>
                  <p className="text-[0.8rem] font-semibold">{r.label}</p>
                  <p className="text-[0.9rem] break-words">
                    {r.places.map((p, i) => (
                      <span key={i}>
                        {i > 0 && <span className="text-gray-300"> · </span>}
                        {p.name} <span className="whitespace-nowrap text-gray-500">({fmtDist(p.distanceKm)})</span>
                      </span>
                    ))}
                  </p>
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
