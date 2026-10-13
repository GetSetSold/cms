import { NextResponse } from "next/server";
import { createMlsClient } from "@/lib/mls";

// Returns distinct cities from ALL property tables (active, sold, historical)
// for the demographics cache warmer. Cached for 1 hour.
export async function GET() {
  try {
    const mls = createMlsClient();
    const citySet = new Set<string>();

    // Active listings grid
    try {
      const { data } = await mls.from("distinct_cities").select("City").limit(5000);
      (data || []).forEach((r: any) => { if (r.City?.trim()) citySet.add(r.City.trim()); });
    } catch {}

    // Property table (may include historical)
    try {
      const { data } = await mls.from("property").select("City").limit(5000);
      (data || []).forEach((r: any) => { if (r.City?.trim()) citySet.add(r.City.trim()); });
    } catch {}

    // Sold listings
    try {
      const { data } = await mls.from("sold").select("City").limit(5000);
      (data || []).forEach((r: any) => { if (r.City?.trim()) citySet.add(r.City.trim()); });
    } catch {}

    const cities = [...citySet].sort((a, b) => a.localeCompare(b));
    return NextResponse.json(
      { cities, count: cities.length },
      { headers: { "Cache-Control": "public, max-age=3600" } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
