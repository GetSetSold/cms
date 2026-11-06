import { NextResponse } from "next/server";
import { createMlsClient } from "@/lib/mls";
import { ONTARIO_CITIES } from "@/lib/ontario-cities";

// Returns Ontario cities for the demographics cache warmer.
// Primary: curated Ontario municipalities list. Supplements with any
// additional cities from the pre-computed city_stats table (one indexed row
// per city) — the old version scanned distinct_cities + property + sold at
// 5,000 rows each, 15,000 rows per call. Cached for 1 hour.
export async function GET() {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
  try {
    const citySet = new Set<string>(ONTARIO_CITIES);

    // Supplement with DB cities (catches any not in the curated list)
    try {
      const mls = createMlsClient();
      const { data } = await mls.from("city_stats").select("city").limit(500);
      (data || []).forEach((r: any) => {
        const c = (r.city as string | undefined)?.trim();
        if (c) citySet.add(c);
      });
    } catch {}

    const cities = [...citySet].sort((a, b) => a.localeCompare(b));
    return NextResponse.json(
      { cities, count: cities.length, source: "ontario-curated+db" },
      { headers: { ...cors, "Cache-Control": "public, max-age=3600" } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: cors });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}
