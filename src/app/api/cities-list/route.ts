import { NextResponse } from "next/server";
import { createMlsClient } from "@/lib/mls";

// Returns distinct CITIES (not neighbourhoods) from all property tables
// for the demographics cache warmer. Cached for 1 hour.
export async function GET() {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
  try {
    const mls = createMlsClient();
    const citySet = new Set<string>();

    const addCities = (rows: any[]) => {
      (rows || []).forEach((r: any) => {
        const c = r.City?.trim();
        if (!c) return;
        // Strip neighbourhood suffix: "Hamilton (Ancaster)" → "Hamilton"
        const base = c.split(" (")[0].trim();
        if (base) citySet.add(base);
      });
    };

    try {
      const { data } = await mls.from("distinct_cities").select("City").limit(5000);
      addCities(data || []);
    } catch {}
    try {
      const { data } = await mls.from("property").select("City").limit(5000);
      addCities(data || []);
    } catch {}
    try {
      const { data } = await mls.from("sold").select("City").limit(5000);
      addCities(data || []);
    } catch {}

    const cities = [...citySet].sort((a, b) => a.localeCompare(b));
    return NextResponse.json(
      { cities, count: cities.length },
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
