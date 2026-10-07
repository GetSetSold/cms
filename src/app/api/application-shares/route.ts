import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { randomBytes } from "crypto";

/** Staff-only: create a shareable link for a rental application (lead). */

const EXPIRY_OPTIONS: Record<string, number> = {
  "24h": 24 * 3600,
  "3d": 3 * 24 * 3600,
  "7d": 7 * 24 * 3600,
};

type Field = { key: string; label: string; type: string; subfields?: Field[] };
type Section = { id: string; heading?: string; fields: Field[] };

function renderValue(value: unknown, field: Field): string | { label: string; value: string }[] | null {
  if (value == null || value === "") return null;
  if (field.type === "subform" && Array.isArray(value)) {
    const rows = (value as Record<string, unknown>[])
      .map((entry) => {
        const label = (field.subfields ?? [])
          .map((sf) => {
            const v = entry[sf.key];
            return v != null && v !== "" ? `${sf.label}: ${String(v)}` : "";
          })
          .filter(Boolean)
          .join(" · ");
        return label ? { label, value: "" } : null;
      })
      .filter(Boolean) as { label: string; value: string }[];
    return rows.length ? rows : null;
  }
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export async function POST(req: NextRequest) {
  let staff;
  try {
    staff = await requireStaff(["admin", "sales", "editor"]);
  } catch {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const leadId = typeof body.lead_id === "string" ? body.lead_id : "";
  const expiryKey = typeof body.expiry === "string" ? body.expiry : "24h";
  if (!leadId) return NextResponse.json({ error: "Missing lead_id." }, { status: 400 });
  const ttl = EXPIRY_OPTIONS[expiryKey] ?? EXPIRY_OPTIONS["24h"];

  const { data: lead, error: leadErr } = await staff.supabase
    .from("leads")
    .select("id,form_key,custom_fields,created_at")
    .eq("id", leadId)
    .maybeSingle();
  if (leadErr || !lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  if ((lead as { form_key: string }).form_key !== "rental_application") {
    return NextResponse.json({ error: "Only rental applications can be shared." }, { status: 400 });
  }

  // Resolve labels via the form definition.
  const { data: form } = await staff.supabase
    .from("forms")
    .select("sections")
    .eq("form_key", "rental_application")
    .maybeSingle();
  const sections = ((form as { sections: Section[] } | null)?.sections ?? []) as Section[];
  const answers = ((lead as { custom_fields: Record<string, unknown> }).custom_fields ?? {});

  const snapshotSections = sections
    .map((sec) => {
      const fields = (sec.fields ?? [])
        .map((f) => {
          if (f.type === "heading") return { label: f.label, value: "", heading: true };
          const rendered = renderValue(answers[f.key], f);
          if (rendered == null) return null;
          return { label: f.label, value: rendered };
        })
        .filter(Boolean);
      return fields.length ? { heading: sec.heading ?? "", fields } : null;
    })
    .filter(Boolean);

  const token = randomBytes(12).toString("base64url");
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

  const { data: settings } = await staff.supabase
    .from("site_settings")
    .select("doc_branding")
    .eq("id", 1)
    .maybeSingle();

  const { data: share, error } = await staff.supabase
    .from("rental_application_shares")
    .insert({
      lead_id: leadId,
      token,
      expires_at: expiresAt,
      branding: (settings as { doc_branding?: unknown } | null)?.doc_branding ?? {},
      snapshot: {
        sections: snapshotSections,
        submitted_at: (lead as { created_at: string }).created_at,
      },
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
  });
}
