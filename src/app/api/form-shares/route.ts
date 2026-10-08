import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

/** Form shares: create, list, revoke, refresh. */

const EXPIRY_OPTIONS: Record<string, number> = {
  "24h": 24 * 3600,
  "3d": 3 * 24 * 3600,
  "7d": 7 * 24 * 3600,
};

type Field = { key: string; label: string; type: string; subfields?: Field[] };
type Section = { id: string; heading?: string; fields: Field[] };

function renderValue(value: unknown, field: Field): string | { label: string; value: string }[] | { subform: Record<string, string>[] } | null {
  if (value == null || value === "") return null;
  if (field.type === "subform" && Array.isArray(value)) {
    const entries = (value as Record<string, unknown>[])
      .map((entry) => {
        const labeled: Record<string, string> = {};
        for (const sf of field.subfields ?? []) {
          const v = entry[sf.key];
          if (v != null && v !== "") labeled[sf.label] = String(v);
        }
        return Object.keys(labeled).length ? labeled : null;
      })
      .filter(Boolean) as Record<string, string>[];
    return entries.length ? { subform: entries } : null;
  }
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function buildSnapshot(sections: Section[], answers: Record<string, unknown>) {
  return sections
    .map((sec) => {
      const fields = (sec.fields ?? [])
        .map((f) => {
          if (f.type === "heading") return null; // headings alone don't make a section worth showing
          const rendered = renderValue(answers[f.key], f);
          if (rendered == null) return null;
          return { label: f.label, value: rendered };
        })
        .filter(Boolean);
      return fields.length ? { heading: sec.heading ?? "", fields } : null;
    })
    .filter(Boolean);
}

/** POST: create a share. Body: { lead_id, attachment_id? (or "main" for the lead's own submission), expiry } */
export async function POST(req: NextRequest) {
  let staff;
  try {
    staff = await requireStaff(["admin", "sales", "editor"]);
  } catch {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const leadId = typeof body.lead_id === "string" ? body.lead_id : "";
  const attachmentId = typeof body.attachment_id === "string" ? body.attachment_id : null;
  const expiryKey = typeof body.expiry === "string" ? body.expiry : "24h";
  if (!leadId) return NextResponse.json({ error: "Missing lead_id." }, { status: 400 });
  const ttl = EXPIRY_OPTIONS[expiryKey] ?? EXPIRY_OPTIONS["24h"];

  let formKey: string, formName: string, answers: Record<string, unknown>, submittedAt: string;

  if (attachmentId) {
    const { data: att } = await staff.supabase
      .from("lead_form_attachments")
      .select("id,lead_id,form_id,form_key,form_name,answers,created_at")
      .eq("id", attachmentId)
      .eq("lead_id", leadId)
      .maybeSingle();
    if (!att) return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
    const a = att as { form_id: string; form_key: string; form_name: string; answers: Record<string, unknown>; created_at: string };
    formKey = a.form_key; formName = a.form_name; answers = a.answers ?? {}; submittedAt = a.created_at;

    var formId = a.form_id;
  } else {
    const { data: lead } = await staff.supabase
      .from("leads")
      .select("id,form_key,custom_fields,created_at")
      .eq("id", leadId)
      .maybeSingle();
    if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    const l = lead as { form_key: string; custom_fields: Record<string, unknown>; created_at: string };
    if (!l.form_key) return NextResponse.json({ error: "Lead has no form submission to share." }, { status: 400 });
    formKey = l.form_key; answers = l.custom_fields ?? {}; submittedAt = l.created_at;

    const { data: form } = await staff.supabase.from("forms").select("id,name").eq("form_key", formKey).maybeSingle();
    formName = ((form as { name: string } | null)?.name) ?? formKey;
    var formId = ((form as { id: string } | null)?.id) ?? "";
  }

  // Resolve labels via the form definition.
  let sections: Section[] = [];
  if (formId) {
    const { data: form } = await staff.supabase.from("forms").select("sections").eq("id", formId).maybeSingle();
    sections = ((form as { sections: Section[] } | null)?.sections ?? []) as Section[];
  }
  const snapshotSections = buildSnapshot(sections, answers);
  const answerCount = snapshotSections.reduce((n, s) => n + (s as { fields: unknown[] }).fields.length, 0);

  const token = randomBytes(12).toString("base64url");
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

  const { data: settings } = await staff.supabase.from("site_settings").select("doc_branding").eq("id", 1).maybeSingle();

  const { data: share, error } = await staff.supabase
    .from("form_shares")
    .insert({
      lead_id: leadId,
      attachment_id: attachmentId,
      token,
      expires_at: expiresAt,
      branding: (settings as { doc_branding?: unknown } | null)?.doc_branding ?? {},
      snapshot: { form_name: formName, sections: snapshotSections, submitted_at: submittedAt },
    })
    .select("token,expires_at")
    .single();

  if (error || !share) {
    return NextResponse.json({ error: error?.message ?? "Failed to create share." }, { status: 500 });
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return NextResponse.json({
    url: `${base}/shared/application/${share.token}`,
    expires_at: share.expires_at,
    preview: { form_name: formName, sections: snapshotSections.length, answers: answerCount },
  });
}

/** GET ?lead_id=... : list active shares for a lead. */
export async function GET(req: NextRequest) {
  let staff;
  try {
    staff = await requireStaff(["admin", "sales", "editor"]);
  } catch {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const leadId = new URL(req.url).searchParams.get("lead_id") ?? "";
  if (!leadId) return NextResponse.json({ error: "Missing lead_id." }, { status: 400 });

  const { data } = await staff.supabase
    .from("form_shares")
    .select("token,expires_at,view_count,created_at,snapshot,attachment_id,lead_id")
    .eq("lead_id", leadId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  // Resolve form names for shares missing it in snapshot (old shares).
  const shares = (data ?? []) as { token: string; expires_at: string; view_count: number; created_at: string; snapshot: { form_name?: string }; attachment_id: string | null; lead_id: string }[];
  const attachmentIds = [...new Set(shares.map((s) => s.attachment_id).filter(Boolean))] as string[];
  const attNames: Record<string, string> = {};
  if (attachmentIds.length) {
    const { data: atts } = await staff.supabase.from("lead_form_attachments").select("id,form_name").in("id", attachmentIds);
    for (const a of (atts ?? []) as { id: string; form_name: string }[]) attNames[a.id] = a.form_name;
  }
  // For main-submission shares, get the lead's form name.
  let leadFormName = "";
  if (shares.some((s) => !s.attachment_id && !s.snapshot?.form_name)) {
    const { data: lead } = await staff.supabase.from("leads").select("form_key").eq("id", leadId).maybeSingle();
    const fk = (lead as { form_key: string } | null)?.form_key;
    if (fk) {
      const { data: form } = await staff.supabase.from("forms").select("name").eq("form_key", fk).maybeSingle();
      leadFormName = ((form as { name: string } | null)?.name) ?? fk;
    }
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return NextResponse.json({
    shares: shares.map((s) => ({
      token: s.token,
      url: `${base}/shared/application/${s.token}`,
      form_name: s.snapshot?.form_name ?? (s.attachment_id ? attNames[s.attachment_id] ?? "Form" : leadFormName || "Form"),
      expires_at: s.expires_at,
      view_count: s.view_count,
      created_at: s.created_at,
    })),
  });
}
