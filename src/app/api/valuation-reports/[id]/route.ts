import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Valuation report: get, update, delete. */

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireStaff(["admin", "editor", "sales"]);
  const { id } = await params;
  const { data, error } = await supabase.from("valuation_reports").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ report: data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireStaff(["admin", "editor", "sales"]);
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of [
    "lead_id", "address", "city", "lat", "lng", "property_type", "beds", "baths",
    "sqft", "lot_size", "year_built", "upgrades", "active_comps", "sold_comps",
    "price_low", "price_high", "recommended_price", "pricing_notes",
    "upgrade_items", "presentation",
  ]) {
    if (k in body) patch[k] = body[k];
  }
  const { error } = await supabase.from("valuation_reports").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireStaff(["admin", "editor"]);
  const { id } = await params;
  const { error } = await supabase.from("valuation_reports").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
