import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

/** Staff: create a send-to-fill token. Public: validate a token. */

export async function POST(req: NextRequest) {
  let staff;
  try {
    staff = await requireStaff(["admin", "sales", "editor"]);
  } catch {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const leadId = typeof body.lead_id === "string" ? body.lead_id : "";
  const formId = typeof body.form_id === "string" ? body.form_id : "";
  if (!leadId || !formId) {
    return NextResponse.json({ error: "Missing lead_id or form_id." }, { status: 400 });
  }

  const { data: form } = await staff.supabase
    .from("forms")
    .select("id,slug")
    .eq("id", formId)
    .eq("is_active", true)
    .maybeSingle();
  if (!form) return NextResponse.json({ error: "Form not found." }, { status: 404 });

  const token = randomBytes(12).toString("base64url");

  const { data: lead } = await staff.supabase
    .from("leads")
    .select("first_name,last_name")
    .eq("id", leadId)
    .maybeSingle();
  const leadName = lead
    ? `${(lead as { first_name: string }).first_name ?? ""} ${(lead as { last_name: string }).last_name ?? ""}`.trim()
    : "";

  const { error } = await staff.supabase.from("lead_form_tokens").insert({
    token,
    lead_id: leadId,
    form_id: formId,
    lead_name: leadName,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return NextResponse.json({
    url: `${base}/forms/${(form as { slug: string }).slug}?t=${token}`,
  });
}

/** Public: validate a token and get the lead + form info. */
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("t") ?? "";
  if (!token) return NextResponse.json({ error: "Missing token." }, { status: 400 });

  const supabase = await createClient();
  const { data } = await supabase
    .from("lead_form_tokens")
    .select("token,lead_id,form_id,lead_name,expires_at,used_at")
    .eq("token", token)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "Invalid or expired link." }, { status: 404 });

  return NextResponse.json({
    lead_id: (data as { lead_id: string }).lead_id,
    form_id: (data as { form_id: string }).form_id,
    lead_name: (data as { lead_name: string }).lead_name ?? "",
  });
}
