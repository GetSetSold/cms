import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireStaff } from "@/lib/auth";

/** Lead subscriptions: property alerts (saved_searches) + pre-con (precon_subscribers table). */

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const { id } = await params;
  const cms = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const [alerts, precon] = await Promise.all([
    cms.from("saved_searches").select("id, criteria_summary, is_active, created_at").eq("lead_id", id).order("created_at", { ascending: false }),
    cms.from("precon_subscribers").select("id, email, filters, is_active, created_at").eq("lead_id", id).order("created_at", { ascending: false }),
  ]);
  const { data: rates } = await cms.from("rate_subscribers").select("id, email, is_active, created_at").eq("lead_id", id).order("created_at", { ascending: false });

  return NextResponse.json({
    propertyAlerts: alerts.data ?? [],
    precon: precon.data ?? [],
    rates: rates ?? [],
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const { id } = await params;
  const body = await req.json();
  const cms = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const filters = {
    all_projects: body.all_projects !== false,
    cities: Array.isArray(body.cities) ? body.cities.filter(Boolean).slice(0, 10) : [],
    min_price: typeof body.min_price === "number" && body.min_price > 0 ? Math.round(body.min_price) : null,
    max_price: typeof body.max_price === "number" && body.max_price > 0 ? Math.round(body.max_price) : null,
  };
  if (filters.cities.length || filters.min_price || filters.max_price) filters.all_projects = false;

  // Get lead email.
  const { data: lead } = await cms.from("leads").select("email, first_name").eq("id", id).single();
  const email = (lead as any)?.email?.toLowerCase().trim();
  if (!email) return NextResponse.json({ error: "Lead has no email" }, { status: 400 });

  const { data, error } = await cms.from("precon_subscribers").insert({
    lead_id: id,
    email,
    first_name: (lead as any)?.first_name ?? null,
    filters,
    is_active: true,
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: (data as any)?.id });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const body = await req.json();
  const { subscription_id, is_active, filters } = body;
  if (!subscription_id) return NextResponse.json({ error: "subscription_id required" }, { status: 400 });
  const cms = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const update: any = {};
  if (typeof is_active === "boolean") update.is_active = is_active;
  if (filters && typeof filters === "object") {
    const clean = {
      all_projects: filters.all_projects !== false,
      cities: Array.isArray(filters.cities) ? filters.cities.filter(Boolean).slice(0, 10) : [],
      min_price: typeof filters.min_price === "number" && filters.min_price > 0 ? Math.round(filters.min_price) : null,
      max_price: typeof filters.max_price === "number" && filters.max_price > 0 ? Math.round(filters.max_price) : null,
    };
    if (clean.cities.length || clean.min_price || clean.max_price) clean.all_projects = false;
    update.filters = clean;
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const { error } = await cms.from("precon_subscribers").update(update).eq("id", subscription_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const { searchParams } = new URL(req.url);
  const subscription_id = searchParams.get("subscription_id");
  if (!subscription_id) return NextResponse.json({ error: "subscription_id required" }, { status: 400 });
  const cms = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { error } = await cms.from("precon_subscribers").delete().eq("id", subscription_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
