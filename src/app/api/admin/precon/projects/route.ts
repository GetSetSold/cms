import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { createPreconServiceClient } from "@/lib/precon";

export async function GET() {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const supabase = createPreconServiceClient();
  const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data });
}

export async function POST(req: Request) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  const supabase = createPreconServiceClient();
  const { data, error } = await supabase.from("projects").insert(body).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data });
}
