import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireStaff } from "@/lib/auth";

function cms() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/** GET /api/admin/precon-subscribers — list all subscribers. */
export async function GET() {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }

  const { data, error } = await cms()
    .from("precon_subscribers")
    .select("id, email, first_name, is_active, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subscribers: data ?? [] });
}

/**
 * POST /api/admin/precon-subscribers { email, firstName? }
 * Manually add a subscriber (also links/creates the CRM lead).
 */
export async function POST(req: NextRequest) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }

  const { email, firstName } = await req.json();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  const db = cms();
  const normalized = email.toLowerCase().trim();

  let leadId: string | null = null;
  const { data: existingLead } = await db.from("leads").select("id").eq("email", normalized).maybeSingle();
  if (existingLead) {
    leadId = existingLead.id;
  } else {
    const { data: newLead } = await db.from("leads").insert({
      email: normalized, service: "buyer", source_path: "/admin/precon-broadcast",
      custom_fields: { source: "precon-alert-manual" }, status: "new",
    }).select("id").single();
    if (newLead) leadId = newLead.id;
  }

  const { data: existing } = await db.from("precon_subscribers").select("id, is_active").eq("email", normalized).maybeSingle();
  if (existing) {
    if (!existing.is_active) await db.from("precon_subscribers").update({ is_active: true }).eq("id", existing.id);
    return NextResponse.json({ ok: true, alreadyExists: true });
  }

  const { data, error } = await db.from("precon_subscribers").insert({
    email: normalized, first_name: firstName?.trim() || null, lead_id: leadId,
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

/** DELETE /api/admin/precon-subscribers?id=... — remove a subscriber. */
export async function DELETE(req: NextRequest) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { error } = await cms().from("precon_subscribers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
