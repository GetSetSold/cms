"use client";
import { useEffect, useState } from "react";

const MAPTILER_KEY = "Zr8EXulAyt75JJibE0ol"; // same public key the site's maps use

type Place = { name: string; address: string; distanceKm: number };
type CategoryResult = { label: string; places: Place[] };

// MapTiler geocoding queries (types=poi restricts to points of interest).
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
  return R * 2 * Math.asin(Math.sqrt(a));
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
 * Nearby places via MapTiler Geocoding API.
 * Proximity biases to the listing; Haversine filters to 10km (like the legacy script).
 */
export function ListingNearbyPlaces({ lat, lng }: { lat: number; lng: number; listingKey: string }) {
  const [results, setResults] = useState<CategoryResult[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const out: CategoryResult[] = await Promise.all(
        CATEGORIES.map(async (cat) => {
          try {
            const url =
              `https://api.maptiler.com/geocoding/${encodeURIComponent(cat.query)}.json` +
              `?key=${MAPTILER_KEY}&types=poi&proximity=${lng},${lat}&limit=25`;
            const res = await fetch(url);
            if (!res.ok) return { label: cat.label, places: [] };
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
              const distanceKm = haversineKm(lat, lng, c[1], c[0]);
              if (distanceKm > 10) continue;
              places.push({
                name,
                address: f.properties?.address || "",
                distanceKm,
              });
            }
            places.sort((a, b) => a.distanceKm - b.distanceKm);
            return { label: cat.label, places: places.slice(0, 5) };
          } catch {
            return { label: cat.label, places: [] };
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

  return (
    <div className="mt-12">
      <h2 className="mb-5 font-display text-2xl">Nearby Places</h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((cat) => (
          <div key={cat.label} className="rounded-2xl bg-white p-5">
            <h3 className="mb-3 font-display text-[1.0rem]">{cat.label}</h3>
            {cat.places.length ? (
              <ul className="flex flex-col gap-2.5">
                {cat.places.map((p, i) => (
                  <li key={`${p.name}-${i}`} className="flex items-baseline justify-between gap-3 text-[13.5px]">
                    <span className="min-w-0 truncate text-ink" title={p.address}>{p.name}</span>
                    <span className="shrink-0 text-muted">{fmtDist(p.distanceKm)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-muted">None found nearby.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
