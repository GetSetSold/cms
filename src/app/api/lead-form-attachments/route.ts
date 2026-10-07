import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { randomBytes } from "crypto";

/** Staff: attach a filled form to an existing lead. */

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
  const answers = body.answers && typeof body.answers === "object" ? body.answers : null;
  if (!leadId || !formId || !answers) {
    return NextResponse.json({ error: "Missing lead_id, form_id, or answers." }, { status: 400 });
  }

  const { data: form, error: formErr } = await staff.supabase
    .from("forms")
    .select("id,name,form_key")
    .eq("id", formId)
    .eq("is_active", true)
    .maybeSingle();
  if (formErr || !form) return NextResponse.json({ error: "Form not found." }, { status: 404 });

  const { data, error } = await staff.supabase
    .from("lead_form_attachments")
    .insert({
      lead_id: leadId,
      form_id: formId,
      form_key: (form as { form_key: string }).form_key,
      form_name: (form as { name: string }).name,
      answers,
      filled_by: "staff",
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to attach form." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: (data as { id: string }).id });
}
