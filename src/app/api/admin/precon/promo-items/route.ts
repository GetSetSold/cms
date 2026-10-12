import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { createPreconServiceClient } from "@/lib/precon";

export async function GET(req: Request) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const { searchParams } = new URL(req.url);
  const promoId = searchParams.get("promo_id");
  const supabase = createPreconServiceClient();
  let q = supabase.from("promo_items").select("*").order("sort_order").order("created_at");
  if (promoId) q = q.eq("promo_id", promoId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const body = await req.json().catch(() => null);
  if (!body?.promo_id || !body?.title?.trim()) {
    return NextResponse.json({ error: "promo_id and title are required." }, { status: 400 });
  }
  const supabase = createPreconServiceClient();
  const { data, error } = await supabase.from("promo_items").insert({
    promo_id: body.promo_id,
    title: body.title.trim(),
    badge: body.badge?.trim() || null,
    icon_url: body.icon_url?.trim() || null,
    description: body.description?.trim() || null,
    sort_order: Number(body.sort_order) || 0,
    show: body.show !== false,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function PATCH(req: Request) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  const supabase = createPreconServiceClient();
  const patch: Record<string, any> = {};
  for (const k of ["title", "badge", "icon_url", "description", "sort_order", "show"]) {
    if (body[k] !== undefined) patch[k] = body[k];
  }
  const { data, error } = await supabase.from("promo_items").update(patch).eq("id", body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(req: Request) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  const supabase = createPreconServiceClient();
  const { error } = await supabase.from("promo_items").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
