import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";

/** DELETE: revoke a share (deletes it, link stops working). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  let staff;
  try {
    staff = await requireStaff(["admin", "sales", "editor"]);
  } catch {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const { token } = await params;
  const { error } = await staff.supabase.from("form_shares").delete().eq("token", token);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
