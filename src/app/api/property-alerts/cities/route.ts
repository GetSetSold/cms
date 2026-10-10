import { NextResponse } from "next/server";
import { listCities } from "@/lib/mls";

/**
 * Get all cities/areas with listings (for property alert form dropdown).
 * Returns raw names including parenthetical areas (e.g., "Caledon", "Caledon (Bolton West)").
 * GET /api/property-alerts/cities
 */
export async function GET() {
  try {
    const cities = await listCities();
    return NextResponse.json({ cities });
  } catch (e) {
    return NextResponse.json({ error: "Failed to load cities" }, { status: 500 });
  }
}
