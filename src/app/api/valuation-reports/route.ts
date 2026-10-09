import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Valuation reports: list + create. */

export async function GET(req: NextRequest) {
  const { supabase } = await requireStaff(["admin", "editor", "sales"]);
  const leadId = new URL(req.url).searchParams.get("lead_id");
  let q = supabase
    .from("valuation_reports")
    .select("id,lead_id,address,city,recommended_price,price_low,price_high,share_token,share_revoked,share_expires_at,view_count,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (leadId) q = q.eq("lead_id", leadId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reports: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { supabase, profile } = await requireStaff(["admin", "editor", "sales"]);
  const body = await req.json().catch(() => ({}));
  if (!body.address || !String(body.address).trim()) {
    return NextResponse.json({ error: "Property address is required." }, { status: 422 });
  }
  const row = {
    lead_id: body.lead_id || null,
    created_by: profile.id,
    address: String(body.address).slice(0, 300),
    city: body.city ? String(body.city).slice(0, 120) : null,
    lat: isFinite(Number(body.lat)) ? Number(body.lat) : null,
    lng: isFinite(Number(body.lng)) ? Number(body.lng) : null,
    property_type: body.property_type ? String(body.property_type).slice(0, 80) : null,
    beds: body.beds ?? null,
    baths: body.baths ?? null,
    sqft: body.sqft ? String(body.sqft).slice(0, 40) : null,
    lot_size: body.lot_size ? String(body.lot_size).slice(0, 80) : null,
    year_built: body.year_built ? String(body.year_built).slice(0, 20) : null,
    upgrades: body.upgrades ? String(body.upgrades).slice(0, 2000) : null,
    active_comps: Array.isArray(body.active_comps) ? body.active_comps.slice(0, 30) : [],
    sold_comps: Array.isArray(body.sold_comps) ? body.sold_comps.slice(0, 30) : [],
    price_low: Number(body.price_low) || null,
    price_high: Number(body.price_high) || null,
    recommended_price: Number(body.recommended_price) || null,
    pricing_notes: body.pricing_notes ? String(body.pricing_notes).slice(0, 2000) : null,
  };
  const { data, error } = await supabase.from("valuation_reports").insert(row).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
