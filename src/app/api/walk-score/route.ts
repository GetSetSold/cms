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

  // Don't cache failures: a bad key or empty response must not poison the
  // 90-day cache. Only successful scores get the long revalidate.
  const res = await fetch(
    `https://api.walkscore.com/score?format=json&lat=${rlat}&lon=${rlng}&wsapikey=${encodeURIComponent(key)}`,
    { cache: "no-store" }
  );
  const d = await res.json().catch(() => null);
  // Walk Score returns status !== 1 on error (bad key, over limit, etc.)
  if (!res.ok || !d || d.status !== 1) {
    return Response.json(
      { error: "upstream", detail: d?.status_description ?? d?.error ?? null },
      { status: 502 }
    );
  }

  return Response.json(
    {
      walkscore: typeof d.walkscore === "number" ? d.walkscore : null,
      description: d.description ?? null,
      transit: d.transit?.score != null ? { score: d.transit.score, description: d.transit.description ?? null } : null,
      bike: d.bike?.score != null ? { score: d.bike.score, description: d.bike.description ?? null } : null,
    },
    { headers: { "Cache-Control": "public, s-maxage=7776000, max-age=86400" } } // 90d edge, 1d browser
  );
}
