import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";

/** POST: revoke a share link. Body: { token } */
export async function POST(req: NextRequest) {
  let staff;
  try {
    staff = await requireStaff(["admin", "sales", "editor"]);
  } catch {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const token = (body as { token?: string }).token ?? "";
  if (!token) return NextResponse.json({ error: "Missing token." }, { status: 400 });

  const { error } = await staff.supabase.from("form_shares").delete().eq("token", token);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
