import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { createPreconServiceClient } from "@/lib/precon";

export async function GET(req: Request) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const projectId = new URL(req.url).searchParams.get("project_id");
  const supabase = createPreconServiceClient();
  let q: any = supabase.from("project_amenities").select("amenity_id");
  if (projectId) q = q.eq("project_id", projectId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project_amenities: data });
}

export async function POST(req: Request) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const body = await req.json().catch(() => null);
  if (!body?.project_id || !body?.amenity_id)
    return NextResponse.json({ error: "project_id and amenity_id are required." }, { status: 400 });
  const supabase = createPreconServiceClient();
  const { data, error } = await supabase
    .from("project_amenities")
    .insert({ project_id: body.project_id, amenity_id: body.amenity_id })
    .select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project_amenity: data });
}

// DELETE ?project_id=X&amenity_id=Y
export async function DELETE(req: Request) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const sp = new URL(req.url).searchParams;
  const projectId = sp.get("project_id");
  const amenityId = sp.get("amenity_id");
  if (!projectId || !amenityId)
    return NextResponse.json({ error: "project_id and amenity_id are required." }, { status: 400 });
  const supabase = createPreconServiceClient();
  const { error } = await supabase.from("project_amenities").delete().eq("project_id", projectId).eq("amenity_id", amenityId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
