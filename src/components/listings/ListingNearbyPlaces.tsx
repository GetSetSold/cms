"use client";
import { useEffect, useState } from "react";

type Place = { name: string; address: string; distanceKm: number };
type CategoryResult = { label: string; places: Place[] };

// OSM tag + search radius (meters) per category.
const CATEGORIES: { label: string; tag: string; radius: number; requireName: boolean }[] = [
  { label: "Schools", tag: "amenity=school", radius: 5000, requireName: true },
  { label: "Groceries", tag: "shop=supermarket", radius: 5000, requireName: true },
  { label: "Restaurants", tag: "amenity=restaurant", radius: 3000, requireName: true },
  { label: "Pharmacy & Health", tag: "amenity=pharmacy", radius: 5000, requireName: true },
  { label: "Commute", tag: "highway=bus_stop", radius: 3000, requireName: false },
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

type OverpassElement = {
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

/**
 * Nearby places via Overpass API (OpenStreetMap) — real category queries
 * by OSM tag within a radius. Free, no key needed.
 */
export function ListingNearbyPlaces({ lat, lng }: { lat: number; lng: number; listingKey: string }) {
  const [results, setResults] = useState<CategoryResult[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const out: CategoryResult[] = await Promise.all(
        CATEGORIES.map(async (cat) => {
          try {
            const [k, v] = cat.tag.split("=");
            const nameFilter = cat.requireName ? `["name"]` : ``;
            // Nodes only (faster than nwr); Kumi instance is more reliable than overpass-api.de.
            const q =
              `[out:json][timeout:15];` +
              `node["${k}"="${v}"]${nameFilter}(around:${cat.radius},${lat},${lng});` +
              `out 50;`;
            const res = await fetch("https://overpass.kumi.systems/api/interpreter", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: "data=" + encodeURIComponent(q),
            });
            if (!res.ok) {
              console.error("Overpass error", res.status, cat.label);
              return { label: cat.label, places: [] };
            }
            const data = (await res.json()) as { elements?: OverpassElement[] };
            const seen = new Set<string>();
            const places: Place[] = [];
            for (const el of data.elements ?? []) {
              const eLat = el.lat ?? el.center?.lat;
              const eLng = el.lon ?? el.center?.lon;
              if (eLat == null || eLng == null) continue;
              const t = el.tags ?? {};
              const name = t.name || (cat.requireName ? "" : "Bus Stop");
              if (!name) continue;
              const key = name.toLowerCase();
              if (seen.has(key)) continue;
              seen.add(key);
              const address = [t["addr:housenumber"], t["addr:street"], t["addr:city"]]
                .filter(Boolean)
                .join(" ") || "Address not listed";
              places.push({
                name,
                address,
                distanceKm: haversineKm(lat, lng, eLat, eLng),
              });
            }
            places.sort((a, b) => a.distanceKm - b.distanceKm);
            return { label: cat.label, places: places.slice(0, 5) };
          } catch (err) {
            console.error("POI fetch failed:", cat.label, err);
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
              <p className="text-[13px] text-muted">No nearby places found.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
