"use client";
import { useEffect, useRef, useState } from "react";

const MAPTILER_KEY = "Zr8EXulAyt75JJibE0ol"; // same key the site's other maps use

type Place = { name: string; distanceKm: number };
type CategoryResult = { label: string; places: Place[] };

/** ~5km bounding box around the listing for category coverage. */
function bboxAround(lat: number, lng: number, km: number): string {
  const dLat = km / 111;
  const dLng = km / (111 * Math.cos((lat * Math.PI) / 180));
  return `${lng - dLng},${lat - dLat},${lng + dLng},${lat + dLat}`;
}

// Text queries for the bbox search (supplements reverse geocode for 3-5km coverage).
const BBOX_QUERIES: { label: string; query: string; match: string[] }[] = [
  { label: "Schools", query: "school", match: ["school"] },
  { label: "Groceries", query: "grocery", match: ["supermarket", "grocery", "convenience", "marketplace"] },
  { label: "Restaurants", query: "restaurant", match: ["restaurant", "cafe", "fast_food", "bar", "pub"] },
  { label: "Pharmacy & Health", query: "pharmacy", match: ["pharmacy", "clinic", "hospital", "doctors", "dentist"] },
  { label: "Transit", query: "bus station", match: ["bus stop", "bus_stop", "station", "railway station", "subway", "tram stop", "halt"] },
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
        // 1. Reverse geocode: the 10 closest POIs (most accurate proximity).
        const revUrl =
          `https://api.maptiler.com/geocoding/${lng},${lat}.json` +
          `?key=${MAPTILER_KEY}&types=poi&limit=10`;
        const revRes = await fetch(revUrl);
        const revData = revRes.ok ? await revRes.json() : { features: [] };
        const closest: (Place & { categories: string[] })[] = (revData.features ?? [])
          .filter((f: any) => Array.isArray(f.center))
          .map((f: any) => ({
            name: String(f.text ?? "").split(",")[0].trim(),
            distanceKm: haversineKm(lat, lng, f.center[1], f.center[0]),
            categories: ((f.properties?.categories ?? []) as string[]).map((c) => c.toLowerCase()),
          }))
          .filter((p: { name: string }) => p.name.length > 0)
          .sort((a: Place, b: Place) => a.distanceKm - b.distanceKm);

        // 2. Bbox search (5km) per category to fill up to 3-5 results each.
        const bbox = bboxAround(lat, lng, 5);
        const bboxResults = await Promise.all(
          BBOX_QUERIES.map(async (cat) => {
            try {
              const url =
                `https://api.maptiler.com/geocoding/${encodeURIComponent(cat.query)}.json` +
                `?key=${MAPTILER_KEY}&bbox=${bbox}&limit=10&types=poi`;
              const res = await fetch(url);
              if (!res.ok) return [] as (Place & { categories: string[] })[];
              const data = await res.json();
              return ((data.features ?? []) as any[])
                .filter((f: any) => Array.isArray(f.center))
                .map((f: any) => ({
                  name: String(f.text ?? f.place_name ?? "").split(",")[0].trim(),
                  distanceKm: haversineKm(lat, lng, f.center[1], f.center[0]),
                  categories: ((f.properties?.categories ?? []) as string[]).map((c) => c.toLowerCase()),
                }))
                .filter((p: Place & { categories: string[] }) => {
                  if (!p.name || p.distanceKm >= 5) return false;
                  return cat.match.some((m) => p.categories.includes(m.toLowerCase()));
                })
                .sort((a: Place, b: Place) => a.distanceKm - b.distanceKm);
            } catch {
              return [] as (Place & { categories: string[] })[];
            }
          })
        );

        // 3. Merge: reverse-geocode hits first (closest), then bbox fills up to 5.
        const out: CategoryResult[] = BBOX_QUERIES.map((cat, i) => {
          const seen = new Set<string>();
          const places: Place[] = [];
          for (const p of [...closest, ...bboxResults[i]]) {
            if (!cat.match.some((m) => p.categories.includes(m.toLowerCase()))) continue;
            const key = p.name.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            places.push({ name: p.name, distanceKm: p.distanceKm });
            if (places.length >= 5) break;
          }
          places.sort((a, b) => a.distanceKm - b.distanceKm);
          return { label: cat.label, places };
        });
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
