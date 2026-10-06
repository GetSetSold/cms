import { NextRequest } from "next/server";

/**
 * GET /api/walk-score?lat=..&lng=..
 * Proxies the Walk Score API so the key stays server-side.
 * Next.js caches each coordinate pair for 90 days (scores barely change).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  if (!lat || !lng || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return Response.json({ error: "bad coordinates" }, { status: 400 });
  }
  const key = process.env.WALKSCORE_API_KEY;
  if (!key) return Response.json({ error: "not configured" }, { status: 503 });

  // Round coords to ~100m so nearby listings share cache entries.
  const rlat = Number(lat).toFixed(3);
  const rlng = Number(lng).toFixed(3);

  const res = await fetch(
    `https://api.walkscore.com/score?format=json&lat=${rlat}&lon=${rlng}&wsapikey=${encodeURIComponent(key)}`,
    { next: { revalidate: 60 * 60 * 24 * 90 } }
  );
  if (!res.ok) return Response.json({ error: "upstream" }, { status: 502 });
  const d = await res.json();

  return Response.json({
    walkscore: typeof d.walkscore === "number" ? d.walkscore : null,
    description: d.description ?? null,
    transit: d.transit?.score != null ? { score: d.transit.score, description: d.transit.description ?? null } : null,
    bike: d.bike?.score != null ? { score: d.bike.score, description: d.bike.description ?? null } : null,
  });
}
