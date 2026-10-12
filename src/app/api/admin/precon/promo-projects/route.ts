import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { createPreconServiceClient } from "@/lib/precon";

export async function GET(req: Request) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id");
  const supabase = createPreconServiceClient();
  if (projectId) {
    const { data, error } = await supabase.from("promo_projects").select("promo_id").eq("project_id", projectId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const ids = (data ?? []).map((r: any) => r.promo_id);
    if (!ids.length) return NextResponse.json({ promos: [] });
    const { data: promos } = await supabase.from("promos").select("*").in("id", ids);
    return NextResponse.json({ promos: promos ?? [] });
  }
  const { data } = await supabase.from("promo_projects").select("*");
  return NextResponse.json({ links: data ?? [] });
}

export async function POST(req: Request) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const body = await req.json().catch(() => null);
  if (!body?.promo_id || !body?.project_id) return NextResponse.json({ error: "promo_id and project_id required." }, { status: 400 });
  const supabase = createPreconServiceClient();
  const { error } = await supabase.from("promo_projects").upsert({ promo_id: body.promo_id, project_id: body.project_id }, { onConflict: "promo_id,project_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const { searchParams } = new URL(req.url);
  const promoId = searchParams.get("promo_id");
  const projectId = searchParams.get("project_id");
  if (!promoId || !projectId) return NextResponse.json({ error: "promo_id and project_id required." }, { status: 400 });
  const supabase = createPreconServiceClient();
  const { error } = await supabase.from("promo_projects").delete().eq("promo_id", promoId).eq("project_id", projectId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
