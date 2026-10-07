import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/geocode?q=...
 * Proxies MapTiler geocoding so the API key (Cloudflare Secret MAPTILER_API_KEY)
 * never reaches the browser. Biased to Ontario, address results only.
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const key = process.env.MAPTILER_API_KEY;

  if (!key) {
    return NextResponse.json(
      { error: "Address search is not configured yet. Add the MAPTILER_API_KEY secret." },
      { status: 503 }
    );
  }
  if (q.length < 3) return NextResponse.json({ features: [] });

  // Ontario bounding box: lng -95.2..-74.3, lat 41.6..56.9
  const url =
    `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json` +
    `?key=${encodeURIComponent(key)}&country=ca&bbox=-95.2%2C41.6%2C-74.3%2C56.9&limit=6&types=address`;

  const res = await fetch(url);
  if (!res.ok) {
    return NextResponse.json({ error: "Address search failed. Please try again." }, { status: 502 });
  }
  const data = await res.json();

  const features = (data.features ?? []).map((f: any) => {
    const [lng, lat] = f.geometry?.coordinates ?? [];
    const ctx: any[] = Array.isArray(f.context) ? f.context : [];
    const city =
      ctx.find((c) => c.id?.startsWith("municipality"))?.text ??
      ctx.find((c) => c.id?.startsWith("locality"))?.text ??
      f.place_name?.split(",").slice(-3, -2)[0]?.trim() ??
      "";
    return {
      label: f.place_name ?? f.text ?? "",
      detail: [f.text, city].filter(Boolean).join(" — ") || undefined,
      lat: typeof lat === "number" ? lat : null,
      lng: typeof lng === "number" ? lng : null,
      city,
    };
  }).filter((f: any) => typeof f.lat === "number" && typeof f.lng === "number");

  return NextResponse.json({ features });
}
