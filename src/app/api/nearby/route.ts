import { NextRequest } from "next/server";

/** Free nearby-places lookup via OpenStreetMap Overpass (no key needed).
 *  Returns up to 3 each of schools, parks, grocery near the given lat/lng. */

function distKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371, t = Math.PI / 180;
  const h = Math.sin(((lat2 - lat1) * t) / 2) ** 2
    + Math.cos(lat1 * t) * Math.cos(lat2 * t) * Math.sin(((lng2 - lng1) * t) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const lat = parseFloat(sp.get("lat") ?? "");
  const lng = parseFloat(sp.get("lng") ?? "");
  if (!isFinite(lat) || !isFinite(lng)) return Response.json({ places: [] });

  const q = `[out:json][timeout:15];(`
    + `node["amenity"="school"](around:3000,${lat},${lng});`
    + `node["leisure"="park"](around:3000,${lat},${lng});`
    + `node["shop"="supermarket"](around:3000,${lat},${lng});`
    + `);out 20;`;
  try {
    const r = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(q),
      signal: AbortSignal.timeout(18000),
    });
    if (!r.ok) return Response.json({ places: [] });
    const j = await r.json();
    const seen = new Set<string>();
    const all: { name: string; kind: string; distKm: number }[] = [];
    for (const el of j.elements ?? []) {
      const tags = el.tags ?? {};
      const name: string | undefined = tags.name;
      if (!name || seen.has(name) || typeof el.lat !== "number") continue;
      seen.add(name);
      const kind = tags.amenity === "school" ? "school" : tags.leisure === "park" ? "park" : "grocery";
      all.push({ name, kind, distKm: Math.round(distKm(lat, lng, el.lat, el.lon) * 10) / 10 });
    }
    all.sort((a, b) => a.distKm - b.distKm);
    const byKind: Record<string, typeof all> = {};
    for (const p of all) (byKind[p.kind] ??= []).push(p);
    const places = ["school", "park", "grocery"].flatMap((k) => (byKind[k] ?? []).slice(0, 3));
    return Response.json({ places });
  } catch {
    return Response.json({ places: [] });
  }
}
