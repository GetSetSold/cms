import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireStaff } from "@/lib/auth";
import { randomUUID } from "crypto";

/**
 * Lead subscriptions: property alerts (saved_searches) + pre-con (stored in leads.payload).
 * Pre-con subscriptions live in leads.payload->precon_subscriptions to avoid
 * PostgREST schema cache issues with new tables.
 */

type PreconSub = {
  id: string;
  filters: { all_projects?: boolean; cities?: string[]; min_price?: number | null; max_price?: number | null };
  is_active: boolean;
  created_at: string;
};

async function getLead(cms: any, id: string) {
  const { data, error } = await cms.from("leads").select("id, payload").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

function getSubs(payload: any): PreconSub[] {
  return Array.isArray(payload?.precon_subscriptions) ? payload.precon_subscriptions : [];
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const { id } = await params;
  const cms = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const [lead, alerts] = await Promise.all([
      getLead(cms, id),
      cms.from("saved_searches").select("id, criteria_summary, is_active, created_at").eq("lead_id", id).order("created_at", { ascending: false }),
    ]);
    return NextResponse.json({
      propertyAlerts: alerts.data ?? [],
      precon: getSubs((lead as any)?.payload),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
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

  try {
    const lead: any = await getLead(cms, id);
    const subs = getSubs(lead.payload);
    const newSub: PreconSub = {
      id: randomUUID(),
      filters,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    subs.push(newSub);
    const { error } = await cms.from("leads")
      .update({ payload: { ...(lead.payload ?? {}), precon_subscriptions: subs } })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, id: newSub.id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const { id } = await params;
  const body = await req.json();
  const { subscription_id, is_active } = body;
  if (!subscription_id) return NextResponse.json({ error: "subscription_id required" }, { status: 400 });
  const cms = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const lead: any = await getLead(cms, id);
    const subs = getSubs(lead.payload).map((s) =>
      s.id === subscription_id ? { ...s, is_active: !!is_active } : s
    );
    const { error } = await cms.from("leads")
      .update({ payload: { ...(lead.payload ?? {}), precon_subscriptions: subs } })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const subscription_id = searchParams.get("subscription_id");
  if (!subscription_id) return NextResponse.json({ error: "subscription_id required" }, { status: 400 });
  const cms = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const lead: any = await getLead(cms, id);
    const subs = getSubs(lead.payload).filter((s) => s.id !== subscription_id);
    const { error } = await cms.from("leads")
      .update({ payload: { ...(lead.payload ?? {}), precon_subscriptions: subs } })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
