// Manual email from the admin lead screen. Requires a signed-in admin or sales user.
// Uses ZeptoMail (or Resend) via the shared sender, based on site_settings.
import { admin, corsHeaders, json, sendEmail } from "../_shared/utils.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  const db = admin();
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: { user } } = await db.auth.getUser(jwt);
  if (!user) return json(req, { error: "Not signed in" }, 401);

  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "sales"].includes((profile as { role: string }).role)) return json(req, { error: "Not allowed" }, 403);

  const { lead_id, subject, body } = await req.json().catch(() => ({}));
  const subj = typeof subject === "string" ? subject.trim().slice(0, 200) : "";
  const text = typeof body === "string" ? body.trim().slice(0, 10000) : "";
  if (!lead_id || !subj || !text) return json(req, { error: "lead_id, subject and body are required" }, 422);

  const { data: lead } = await db.from("leads")
    .select("id, email, first_name").eq("id", lead_id).maybeSingle();
  if (!(lead as { email: string } | null)?.email) return json(req, { error: "This lead has no email address" }, 422);

  const { data: settings } = await db.from("site_settings").select("email_provider, site_name").single();

  // Replace placeholders.
  const leadEmail = (lead as { email: string }).email;
  const firstName = ((lead as { first_name: string | null }).first_name ?? "").trim();
  const rendered = text
    .replace(/\{\{\s*first_name\s*\}\}/g, firstName || "there")
    .replace(/\{\{\s*site_name\s*\}\}/g, settings?.site_name ?? "GetSetSold");
  const renderedSubject = subj
    .replace(/\{\{\s*first_name\s*\}\}/g, firstName || "there")
    .replace(/\{\{\s*site_name\s*\}\}/g, settings?.site_name ?? "GetSetSold");

  try {
    const sent = await sendEmail(leadEmail, renderedSubject, rendered, undefined, settings?.email_provider ?? "zeptomail");
    await db.from("lead_activities").insert({ lead_id, type: "email_out", body: `${renderedSubject}\n\n${rendered}`, created_by: user.id, meta: sent });
    return json(req, { ok: true });
  } catch (e) {
    return json(req, { error: String(e) }, 502);
  }
});
