import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireStaff } from "@/lib/auth";

/** Lead rate alert subscription management. */

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const { id } = await params;
  const cms = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: lead } = await cms.from("leads").select("email, first_name").eq("id", id).single();
  const email = (lead as any)?.email?.toLowerCase().trim();
  if (!email) return NextResponse.json({ error: "Lead has no email" }, { status: 400 });

  const { data: existing } = await cms.from("rate_subscribers").select("id").eq("email", email).maybeSingle();
  if ((existing as any)?.id) {
    await cms.from("rate_subscribers").update({ is_active: true, lead_id: id }).eq("id", (existing as any).id);
    return NextResponse.json({ ok: true, alreadyExists: true });
  }

  const { error } = await cms.from("rate_subscribers").insert({
    email, first_name: (lead as any)?.first_name ?? null, lead_id: id, is_active: true,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const { subscription_id, is_active } = await req.json();
  if (!subscription_id) return NextResponse.json({ error: "subscription_id required" }, { status: 400 });
  const cms = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { error } = await cms.from("rate_subscribers").update({ is_active: !!is_active }).eq("id", subscription_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const subscription_id = req.nextUrl.searchParams.get("subscription_id");
  if (!subscription_id) return NextResponse.json({ error: "subscription_id required" }, { status: 400 });
  const cms = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { error } = await cms.from("rate_subscribers").delete().eq("id", subscription_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
