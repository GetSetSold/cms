import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";

/** POST: refresh a share — re-snapshots current answers/branding, keeps the same URL. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  let staff;
  try {
    staff = await requireStaff(["admin", "sales", "editor"]);
  } catch {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const { token } = await params;

  const { data: share } = await staff.supabase
    .from("form_shares")
    .select("lead_id,attachment_id")
    .eq("token", token)
    .maybeSingle();
  if (!share) return NextResponse.json({ error: "Share not found." }, { status: 404 });
  const s = share as { lead_id: string; attachment_id: string | null };

  // Rebuild the snapshot from current data.
  let answers: Record<string, unknown>, formKey: string, formName: string, formId: string, submittedAt: string;
  if (s.attachment_id) {
    const { data: att } = await staff.supabase
      .from("lead_form_attachments")
      .select("form_id,form_key,form_name,answers,created_at")
      .eq("id", s.attachment_id)
      .maybeSingle();
    if (!att) return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
    const a = att as { form_id: string; form_key: string; form_name: string; answers: Record<string, unknown>; created_at: string };
    answers = a.answers ?? {}; formKey = a.form_key; formName = a.form_name; formId = a.form_id; submittedAt = a.created_at;
  } else {
    const { data: lead } = await staff.supabase
      .from("leads")
      .select("form_key,custom_fields,created_at")
      .eq("id", s.lead_id)
      .maybeSingle();
    if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    const l = lead as { form_key: string; custom_fields: Record<string, unknown>; created_at: string };
    answers = l.custom_fields ?? {}; formKey = l.form_key; submittedAt = l.created_at;
    const { data: form } = await staff.supabase.from("forms").select("id,name").eq("form_key", formKey).maybeSingle();
    formName = ((form as { name: string } | null)?.name) ?? formKey;
    formId = ((form as { id: string } | null)?.id) ?? "";
  }

  // Re-resolve labels (simplified: use answer keys as labels if form not found).
  let sections: { heading: string; fields: { label: string; value: unknown }[] }[] = [];
  if (formId) {
    const { data: form } = await staff.supabase.from("forms").select("sections").eq("id", formId).maybeSingle();
    const formSections = ((form as { sections: { id: string; heading?: string; fields: { key: string; label: string; type: string }[] }[] } | null)?.sections ?? []);
    sections = formSections
      .map((sec) => {
        const fields = (sec.fields ?? [])
          .map((f) => {
            if (f.type === "heading") return null;
            const v = answers[f.key];
            if (v == null || v === "") return null;
            return { label: f.label, value: Array.isArray(v) ? v.map(String).join(", ") : String(v) };
          })
          .filter(Boolean) as { label: string; value: unknown }[];
        return fields.length ? { heading: sec.heading ?? "", fields } : null;
      })
      .filter(Boolean) as { heading: string; fields: { label: string; value: unknown }[] }[];
  }

  const { data: settings } = await staff.supabase.from("site_settings").select("doc_branding").eq("id", 1).maybeSingle();

  const { error } = await staff.supabase
    .from("form_shares")
    .update({
      branding: (settings as { doc_branding?: unknown } | null)?.doc_branding ?? {},
      snapshot: { form_name: formName, sections, submitted_at: submittedAt },
    })
    .eq("token", token);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
