"use client";
import { useEffect, useRef, useState } from "react";

const MAPTILER_KEY = "Zr8EXulAyt75JJibE0ol"; // same key the site's other maps use

type Place = { name: string; distanceKm: number };
type CategoryResult = { label: string; places: Place[] };

// Category matchers against the API's `properties.categories` (real OSM data).
const CATEGORIES: { label: string; match: string[] }[] = [
  { label: "Schools", match: ["school"] },
  { label: "Groceries", match: ["supermarket", "grocery", "convenience", "marketplace"] },
  { label: "Restaurants", match: ["restaurant", "cafe", "fast_food", "bar", "pub"] },
  { label: "Pharmacy & Health", match: ["pharmacy", "clinic", "hospital", "doctors", "dentist"] },
  { label: "Transit", match: ["bus stop", "bus_stop", "station", "railway station", "subway", "tram stop", "halt"] },
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
 * Nearby places via MapTiler reverse geocoding: one call with the listing's
 * coordinates returns the closest POIs with real OSM categories. Grouped
 * into the 5 category blocks.
 */
export function ListingNearbyPlaces({ lat, lng }: { lat: number; lng: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<CategoryResult[] | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    const load = async () => {
      try {
        const url =
          `https://api.maptiler.com/geocoding/${lng},${lat}.json` +
          `?key=${MAPTILER_KEY}&types=poi&limit=10`;
        const res = await fetch(url);
        if (!res.ok) {
          if (!cancelled) setResults([]);
          return;
        }
        const data = await res.json();
        const pois: (Place & { categories: string[] })[] = (data.features ?? [])
          .filter((f: any) => Array.isArray(f.center))
          .map((f: any) => ({
            name: String(f.text ?? "").split(",")[0].trim(),
            distanceKm: haversineKm(lat, lng, f.center[1], f.center[0]),
            categories: ((f.properties?.categories ?? []) as string[]).map((c) => c.toLowerCase()),
          }))
          .filter((p: { name: string }) => p.name.length > 0)
          .sort((a: Place, b: Place) => a.distanceKm - b.distanceKm);

        const out: CategoryResult[] = CATEGORIES.map((cat) => ({
          label: cat.label,
          places: pois
            .filter((p) => cat.match.some((m) => p.categories.includes(m.toLowerCase())))
            .slice(0, 5)
            .map(({ name, distanceKm }) => ({ name, distanceKm })),
        }));
        if (!cancelled) setResults(out);
      } catch {
        if (!cancelled) setResults([]);
      }
    };
    // Load only when scrolled near into view, so listings that aren't
    // scrolled to cost zero API calls.
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
