import { NextResponse } from "next/server";
import { createMlsClient } from "@/lib/mls";

// Returns distinct cities from the MLS grid for the demographics warmer.
// Cached for 1 hour — city list changes slowly.
export async function GET() {
  try {
    const mls = createMlsClient();
    const { data, error } = await mls.from("distinct_cities").select("City").limit(5000);
    if (error) throw error;
    const cities = (data || [])
      .map((r: any) => r.City)
      .filter((c: string) => c && c.trim())
      .sort((a: string, b: string) => a.localeCompare(b));
    return NextResponse.json(
      { cities, count: cities.length },
      { headers: { "Cache-Control": "public, max-age=3600" } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
