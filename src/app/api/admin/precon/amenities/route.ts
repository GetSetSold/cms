import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { createPreconServiceClient } from "@/lib/precon";

export async function GET() {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const supabase = createPreconServiceClient();
  const { data, error } = await supabase.from("amenities").select("*").order("title");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ amenities: data });
}

export async function POST(req: Request) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const body = await req.json().catch(() => null);
  if (!body?.title?.trim()) return NextResponse.json({ error: "Title is required." }, { status: 400 });
  const supabase = createPreconServiceClient();
  const { data, error } = await supabase.from("amenities").insert(body).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ amenity: data });
}
