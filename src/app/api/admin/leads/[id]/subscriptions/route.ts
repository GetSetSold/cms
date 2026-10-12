import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireStaff } from "@/lib/auth";

/** Lead subscriptions: property alerts + pre-con subscriptions. */

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const { id } = await params;
  const cms = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const [alerts, precon] = await Promise.all([
    cms.from("saved_searches").select("id, criteria_summary, is_active, created_at").eq("lead_id", id).order("created_at", { ascending: false }),
    cms.rpc("get_lead_precon_subs", { p_lead_id: id }),
  ]);

  // Fallback: if RPC missing, try direct table query
  let preconList: any[] = [];
  if (precon.error) {
    const direct = await cms.from("precon_subscriptions").select("id, email, filters, is_active, created_at").eq("lead_id", id).order("created_at", { ascending: false });
    preconList = direct.data ?? [];
  } else {
    preconList = (precon.data as any) ?? [];
  }

  return NextResponse.json({
    propertyAlerts: alerts.data ?? [],
    precon: preconList,
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

  const { data, error } = await cms.rpc("add_precon_subscription", { p_lead_id: id, p_filters: filters });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const body = await req.json();
  const { subscription_id, is_active } = body;
  if (!subscription_id) return NextResponse.json({ error: "subscription_id required" }, { status: 400 });
  const cms = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { error } = await cms.rpc("toggle_precon_subscription", { p_id: subscription_id, p_active: !!is_active });
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
  const { error } = await cms.rpc("delete_precon_subscription", { p_id: subscription_id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
