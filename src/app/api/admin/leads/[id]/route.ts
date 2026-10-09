import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";

/** Single lead for prefill (valuation builder, etc.). Staff only. */

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireStaff(["admin", "editor", "sales"]);
  const { id } = await params;
  const { data, error } = await supabase
    .from("leads")
    .select("id,first_name,last_name,email,phone,service,form_key,custom_fields")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ lead: data });
}
