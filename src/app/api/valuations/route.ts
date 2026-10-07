import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/valuations
 * Persists a completed home valuation and returns its shareable public link.
 * One cheap insert per valuation — the row doubles as seller-intent signal
 * (address + timestamp) for the business.
 */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
function genPublicId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b & 63]).join("");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const estimate = body.estimate;
  if (!body.addressLabel || !estimate || typeof estimate.low !== "number") {
    return NextResponse.json({ error: "A completed valuation is required." }, { status: 422 });
  }

  const listings = Array.isArray(body.listings) ? body.listings.slice(0, 20) : [];
  const supabase = await createClient();

  for (let attempt = 0; attempt < 3; attempt++) {
    const publicId = genPublicId();
    const { error } = await supabase.from("valuations").insert({
      public_id: publicId,
      address: String(body.addressLabel).slice(0, 300),
      city: body.city ? String(body.city).slice(0, 120) : null,
      lat: isFinite(Number(body.lat)) ? Number(body.lat) : null,
      lng: isFinite(Number(body.lng)) ? Number(body.lng) : null,
      details: {
        propertyType: body.propertyType ?? null,
        condition: body.condition ?? null,
        beds: body.beds ?? null,
        baths: body.baths ?? null,
        sqft: body.sqft ?? null,
        renovations: Array.isArray(body.renovations) ? body.renovations : [],
      },
      estimate_low: Math.round(estimate.low),
      estimate_mid: Math.round(estimate.mid),
      estimate_high: Math.round(estimate.high),
      range_pct: isFinite(Number(body.rangePct)) ? Number(body.rangePct) : null,
      listings,
      hpi: body.hpi ?? {},
      radius_km: isFinite(Number(body.radiusKm)) ? Number(body.radiusKm) : null,
      data_as_of: /^\d{4}-\d{2}-\d{2}$/.test(String(body.dataAsOf))
        ? body.dataAsOf
        : new Date().toISOString().slice(0, 10),
    });
    if (!error) {
      return NextResponse.json({ ok: true, publicId, url: `/valuation/${publicId}` });
    }
    // Retry only on public_id collision; anything else is a real failure.
    if (!/duplicate|unique/i.test(error.message)) {
      console.error("[valuations] insert failed:", error.message);
      return NextResponse.json(
        { error: "Could not save valuation.", detail: error.message.slice(0, 200) },
        { status: 500 },
      );
    }
  }
  return NextResponse.json({ error: "Could not save valuation." }, { status: 500 });
}
