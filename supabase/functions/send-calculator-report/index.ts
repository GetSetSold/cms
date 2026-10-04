// Calculator PDF report delivery: validates the request, stores/updates the
// lead in the CMS, and emails the PDF report to the visitor via ZeptoMail.
import { admin, corsHeaders, json, sendEmail } from "../_shared/utils.ts";

const clip = (v: unknown, n: number) =>
  (typeof v === "string" ? v.trim().slice(0, n) : "") || null;

const MAX_PDF_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_PER_HOUR = 5;

function isPdfBase64(b64: string): boolean {
  try {
    const bin = atob(b64.slice(0, 16));
    return bin.startsWith("%PDF");
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "Invalid JSON" }, 400);
  }

  const firstName = clip(body.first_name, 100);
  const lastName = clip(body.last_name, 100);
  const email = clip(body.email, 200)?.toLowerCase() ?? null;
  const slug = clip(body.calculator_slug, 120);
  const title = clip(body.calculator_title, 200) ?? "Calculator";
  const pdfBase64 = typeof body.pdf_base64 === "string" ? body.pdf_base64 : "";
  const fileName = clip(body.file_name, 120) ?? "report.pdf";
  const path = clip(body.path, 500);

  if (!firstName || !lastName) return json(req, { error: "Please enter your first and last name." }, 422);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return json(req, { error: "Please enter a valid email address." }, 422);
  if (!slug) return json(req, { error: "Missing calculator reference." }, 422);
  if (!pdfBase64 || pdfBase64.length > (MAX_PDF_BYTES * 4) / 3 + 1024)
    return json(req, { error: "Report file is too large." }, 413);
  if (!isPdfBase64(pdfBase64)) return json(req, { error: "Invalid report file." }, 422);
  if (!/^[a-z0-9-]+\.pdf$/i.test(fileName)) return json(req, { error: "Invalid file name." }, 422);

  const db = admin();

  // Rate limit: max N report emails per address per hour
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .eq("form_key", "calculator-report")
    .gte("created_at", hourAgo);
  if ((count ?? 0) >= MAX_PER_HOUR) {
    return json(req, { error: "Too many reports sent. Please try again later." }, 429);
  }

  // Upsert the lead: reuse the existing row for this email when there is one
  const reportMeta = { calculator_slug: slug, calculator_title: title, sent_at: new Date().toISOString(), path };
  let leadId: string;
  const { data: existing } = await db
    .from("leads")
    .select("id, custom_fields")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    leadId = existing.id as string;
    const cf = (existing.custom_fields ?? {}) as Record<string, unknown>;
    const reports = Array.isArray(cf.calculator_reports) ? cf.calculator_reports : [];
    const { error } = await db
      .from("leads")
      .update({
        first_name: firstName,
        last_name: lastName,
        custom_fields: { ...cf, calculator_reports: [...reports, reportMeta].slice(-20) },
      })
      .eq("id", leadId);
    if (error) {
      console.error("calculator-report lead update failed", error);
      return json(req, { error: "Could not save your request. Please try again." }, 500);
    }
  } else {
    const { data: lead, error } = await db
      .from("leads")
      .insert({
        first_name: firstName,
        last_name: lastName,
        email,
        form_key: "calculator-report",
        source_path: path,
        utm: {},
        custom_fields: { calculator_reports: [reportMeta] },
        message: `Requested the ${title} PDF report.`,
      })
      .select("id")
      .single();
    if (error || !lead) {
      console.error("calculator-report lead insert failed", error);
      return json(req, { error: "Could not save your request. Please try again." }, 500);
    }
    leadId = lead.id as string;
  }

  await db.from("lead_activities").insert({
    lead_id: leadId,
    type: "system",
    body: `Calculator report emailed: ${title}`,
    meta: { calculator_slug: slug, path },
  });

  // Email the PDF to the visitor
  const { data: settings } = await db.from("site_settings").select("email_provider").single();
  const provider = (settings as { email_provider?: "zeptomail" | "resend" } | null)?.email_provider ?? "zeptomail";
  try {
    await sendEmail(
      email,
      `Your ${title} report — GetSetSold.ca`,
      `Hi ${firstName},\n\nYour ${title} PDF report is attached.\n\nIf you have questions about these numbers, just reply to this email — I'm happy to walk through them with you.\n\nRohit Sharma\nLombard Group Real Estate Inc., Brokerage\nhttps://www.getsetsold.ca`,
      undefined,
      provider,
      [{ name: fileName, content: pdfBase64, mime_type: "application/pdf" }],
    );
  } catch (e) {
    console.error("calculator-report email failed", e);
    return json(req, { error: "Could not email the report. Please try downloading it instead." }, 502);
  }

  return json(req, { ok: true });
});
