import { NextResponse } from "next/server";
import { createMlsClient } from "@/lib/mls";
import { ONTARIO_CITIES } from "@/lib/ontario-cities";

// Returns Ontario cities for the demographics cache warmer.
// Primary: curated Ontario municipalities list. Supplements with any
// additional cities found in property tables. Cached for 1 hour.
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
      const addCities = (rows: any[]) => {
        (rows || []).forEach((r: any) => {
          const c = r.City?.trim();
          if (!c) return;
          const base = c.split(" (")[0].trim();
          if (base && !citySet.has(base)) citySet.add(base);
        });
      };
      const [a, b, c] = await Promise.all([
        mls.from("distinct_cities").select("City").limit(5000),
        mls.from("property").select("City").limit(5000),
        mls.from("sold").select("City").limit(5000),
      ]);
      addCities(a.data || []);
      addCities(b.data || []);
      addCities(c.data || []);
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
