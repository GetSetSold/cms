import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { createPreconServiceClient } from "@/lib/precon";

export async function GET(req: Request) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const { searchParams } = new URL(req.url);
  const relatedType = searchParams.get("related_type");
  const relatedId = searchParams.get("related_id");
  const supabase = createPreconServiceClient();
  let q: any = supabase.from("image_assignments").select("*");
  if (relatedType) q = q.eq("related_type", relatedType);
  if (relatedId) q = q.eq("related_id", relatedId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ image_assignments: data });
}

export async function POST(req: Request) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const body = await req.json().catch(() => null);
  if (!body?.image_id || !body?.related_type || !body?.related_id)
    return NextResponse.json({ error: "image_id, related_type and related_id are required." }, { status: 400 });
  const supabase = createPreconServiceClient();
  const { data, error } = await supabase.from("image_assignments").insert({ image_id: body.image_id, related_type: body.related_type, related_id: body.related_id }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ image_assignment: data });
}

// Delete by composite key: ?image_id=X&related_type=Y&related_id=Z
export async function DELETE(req: Request) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const { searchParams } = new URL(req.url);
  const imageId = searchParams.get("image_id");
  const relatedType = searchParams.get("related_type");
  const relatedId = searchParams.get("related_id");
  if (!imageId || !relatedType || !relatedId)
    return NextResponse.json({ error: "image_id, related_type and related_id are required." }, { status: 400 });
  const supabase = createPreconServiceClient();
  const { error } = await supabase.from("image_assignments").delete().eq("image_id", imageId).eq("related_type", relatedType).eq("related_id", relatedId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
