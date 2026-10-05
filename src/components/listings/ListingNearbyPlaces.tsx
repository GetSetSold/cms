"use client";
import { useEffect, useState } from "react";

const MAPTILER_KEY = "Zr8EXulAyt75JJibE0ol"; // same public key the site's maps use

type Place = { name: string; distanceKm: number; address?: string };
type CategoryResult = { label: string; places: Place[]; error?: boolean };

// Category → MapTiler geocoding query (types=poi restricts to points of interest).
const CATEGORIES: { label: string; query: string }[] = [
  { label: "Schools", query: "school" },
  { label: "Groceries", query: "grocery" },
  { label: "Restaurants", query: "restaurant" },
  { label: "Pharmacy & Health", query: "pharmacy" },
  { label: "Commute", query: "station" },
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

type MaptilerFeature = {
  place_name?: string;
  text?: string;
  center?: [number, number];
  properties?: { address?: string };
};

/**
 * Nearby places via MapTiler Geocoding API (free tier, types=poi).
 * Hard bbox (~5km) around the listing keeps results local.
 */
export function ListingNearbyPlaces({ lat, lng }: { lat: number; lng: number; listingKey: string }) {
  const [results, setResults] = useState<CategoryResult[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    // 8km radius for better POI coverage in suburban/rural areas.
    const latDelta = 8 / 111;
    const lngDelta = 8 / (111 * Math.cos((lat * Math.PI) / 180));
    const bbox = `${lng - lngDelta},${lat - latDelta},${lng + lngDelta},${lat + latDelta}`;

    (async () => {
      const out: CategoryResult[] = await Promise.all(
        CATEGORIES.map(async (cat) => {
          try {
            const url =
              `https://api.maptiler.com/geocoding/${encodeURIComponent(cat.query)}.json` +
              `?key=${MAPTILER_KEY}&types=poi&bbox=${bbox}&limit=20`;
            const res = await fetch(url);
            if (!res.ok) return { label: cat.label, places: [], error: true };
            const data = (await res.json()) as { features?: MaptilerFeature[] };
            const seen = new Set<string>();
            const places: Place[] = [];
            for (const f of data.features ?? []) {
              const name = f.text || f.place_name?.split(",")[0] || "";
              if (!name) continue;
              const key = name.toLowerCase();
              if (seen.has(key)) continue;
              seen.add(key);
              const c = f.center;
              if (!c || c.length < 2) continue;
              places.push({
                name,
                distanceKm: haversineKm(lat, lng, c[1], c[0]),
                address: f.properties?.address,
              });
            }
            places.sort((a, b) => a.distanceKm - b.distanceKm);
            return { label: cat.label, places: places.slice(0, 5) };
          } catch {
            return { label: cat.label, places: [], error: true };
          }
        }),
      );
      if (!cancelled) setResults(out);
    })();

    return () => { cancelled = true; };
  }, [lat, lng]);

  if (results === null) {
    return (
      <div className="mt-12">
        <h2 className="mb-5 font-display text-2xl">Nearby Places</h2>
        <p className="text-sm text-muted">Searching nearby places…</p>
      </div>
    );
  }

  const hasAny = results.some((r) => r.places.length > 0);
  if (!hasAny) return null;

  return (
    <div className="mt-12">
      <h2 className="mb-5 font-display text-2xl">Nearby Places</h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((cat) =>
          cat.places.length ? (
            <div key={cat.label} className="rounded-2xl bg-white p-5">
              <h3 className="mb-3 font-display text-[1.0rem]">{cat.label}</h3>
              <ul className="flex flex-col gap-2.5">
                {cat.places.map((p, i) => (
                  <li key={`${p.name}-${i}`} className="flex items-baseline justify-between gap-3 text-[13.5px]">
                    <span className="min-w-0 truncate text-ink">{p.name}</span>
                    <span className="shrink-0 text-muted">{fmtDist(p.distanceKm)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}
