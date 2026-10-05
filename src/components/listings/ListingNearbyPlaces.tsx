"use client";
import { useEffect, useState } from "react";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

type Place = { name: string; address: string; distanceKm: number };
type CategoryResult = { label: string; places: Place[] };

// radius in metres; multiple OSM tag filters per category.
const POI_CATEGORIES: { label: string; radius: number; filters: [string, string][] }[] = [
  { label: "Schools", radius: 4000, filters: [["amenity", "school"]] },
  { label: "Commute", radius: 1500, filters: [["highway", "bus_stop"], ["railway", "station"], ["public_transport", "station"]] },
  { label: "Pharmacy & Health", radius: 3000, filters: [["amenity", "pharmacy"], ["amenity", "clinic"], ["amenity", "hospital"]] },
  { label: "Groceries", radius: 3000, filters: [["shop", "supermarket"], ["shop", "convenience"]] },
  { label: "Restaurants", radius: 2000, filters: [["amenity", "restaurant"]] },
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

async function queryOverpass(query: string): Promise<{ elements?: OverpassElement[] } | null> {
  for (const url of OVERPASS_ENDPOINTS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(query),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.ok) return (await res.json()) as { elements?: OverpassElement[] };
      console.warn("Overpass", res.status, url);
    } catch (err) {
      clearTimeout(timer);
      console.warn("Overpass failed", url, (err as Error).name);
    }
  }
  return null;
}

/**
 * Nearby places via Overpass API — one combined query for all categories,
 * failover across 3 endpoints, 7-day localStorage cache.
 */
export function ListingNearbyPlaces({ lat, lng }: { lat: number; lng: number; listingKey: string }) {
  const [results, setResults] = useState<CategoryResult[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = `poi:${lat.toFixed(4)},${lng.toFixed(4)}`;

    (async () => {
      // Check cache first (7 days).
      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) ?? "null") as
          | { t: number; data: CategoryResult[] }
          | null;
        if (cached && Date.now() - cached.t < 7 * 864e5) {
          if (!cancelled) setResults(cached.data);
          return;
        }
      } catch { /* ignore */ }

      // One combined query for all categories.
      const parts: string[] = [];
      for (const c of POI_CATEGORIES) {
        for (const [k, v] of c.filters) {
          parts.push(`nwr["${k}"="${v}"](around:${c.radius},${lat},${lng});`);
        }
      }
      const q = `[out:json][timeout:25];(${parts.join("")});out center 500;`;
      const json = await queryOverpass(q);

      let out: CategoryResult[];
      if (!json) {
        out = POI_CATEGORIES.map((c) => ({ label: c.label, places: [] }));
      } else {
        const byLabel: Record<string, Place[]> = {};
        for (const c of POI_CATEGORIES) byLabel[c.label] = [];
        const seen = new Set<string>();

        for (const el of json.elements ?? []) {
          const eLat = el.lat ?? el.center?.lat;
          const eLng = el.lon ?? el.center?.lon;
          if (eLat == null || eLng == null) continue;
          const t = el.tags ?? {};
          const name = t.name || (t.highway === "bus_stop" ? "Bus stop" : "");
          if (!name) continue;
          const key = name.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          const distanceKm = haversineKm(lat, lng, eLat, eLng);
          const address = [t["addr:housenumber"], t["addr:street"], t["addr:city"]]
            .filter(Boolean)
            .join(" ") || "Address not listed";

          for (const c of POI_CATEGORIES) {
            const matches = c.filters.some(([fk, fv]) => t[fk] === fv);
            if (matches && distanceKm <= c.radius / 1000) {
              byLabel[c.label].push({ name, address, distanceKm });
            }
          }
        }

        out = POI_CATEGORIES.map((c) => {
          const places = byLabel[c.label]
            .sort((a, b) => a.distanceKm - b.distanceKm)
            .slice(0, 5);
          return { label: c.label, places };
        });

        // Cache for 7 days.
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), data: out }));
        } catch { /* ignore */ }
      }

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
      <h2 className="mb-5 border-b border-line pb-3 font-display text-2xl">Nearby Places</h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((cat) => (
          <div key={cat.label} className="rounded-2xl bg-white p-5">
            <h3 className="mb-3 border-b border-line pb-2 font-display text-[1.0rem]">{cat.label}</h3>
            {cat.places.length ? (
              <ul className="flex flex-col divide-y divide-line">
                {cat.places.map((p, i) => (
                  <li key={`${p.name}-${i}`} className="flex items-baseline justify-between gap-3 py-2 text-[13.5px] first:pt-0 last:pb-0">
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
