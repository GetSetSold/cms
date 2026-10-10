import { NextResponse } from "next/server";
import { listCities } from "@/lib/mls";

/**
 * Get normalized city names (strip parenthetical areas, dedupe).
 * GET /api/property-alerts/cities
 */
export async function GET() {
  try {
    const raw = await listCities();
    // Normalize: "Caledon (Bolton West)" -> "Caledon", dedupe.
    const seen = new Set<string>();
    const cities: string[] = [];
    for (const c of raw) {
      const normalized = c.replace(/\s*\(.*?\)\s*/g, "").trim();
      if (normalized && !seen.has(normalized.toLowerCase())) {
        seen.add(normalized.toLowerCase());
        cities.push(normalized);
      }
    }
    cities.sort();
    return NextResponse.json({ cities });
  } catch (e) {
    return NextResponse.json({ error: "Failed to load cities" }, { status: 500 });
  }
}
