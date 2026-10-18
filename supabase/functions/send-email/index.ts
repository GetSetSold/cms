// Manual email from the admin lead screen. Requires a signed-in admin or sales user.
// Uses ZeptoMail (or Resend) via the shared sender, based on site_settings.
import { admin, corsHeaders, json, sendEmail } from "../_shared/utils.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  try {
    const db = admin();
    const payload = await req.json().catch(() => ({}));

    // System mode: server-to-server (service role) sends with to_email/html_body.
    // Used by property alerts and other automated senders. The service role key
    // in the Authorization header is the credential — no user session needed.
    if (typeof payload.to_email === "string" && payload.to_email) {
      const toEmail = payload.to_email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
        return json(req, { error: `Invalid email address: "${toEmail}"` }, 422);
      }
      const subj = typeof payload.subject === "string" ? payload.subject.trim().slice(0, 200) : "";
      const htmlBody = typeof payload.html_body === "string" ? payload.html_body : "";
      const textBody = typeof payload.body === "string" ? payload.body.trim().slice(0, 10000) : "";
      if (!subj || (!htmlBody && !textBody)) {
        return json(req, { error: "subject and html_body (or body) are required" }, 422);
      }
      const { data: settings } = await db.from("site_settings").select("email_provider").maybeSingle();
      const provider = (settings as { email_provider?: "zeptomail" | "resend" } | null)?.email_provider ?? "zeptomail";
      const sent = await sendEmail(toEmail, subj, textBody || subj, htmlBody || undefined, provider);
      return json(req, { ok: true, meta: sent });
    }

    // Manual mode: requires a signed-in admin or sales user.
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = await db.auth.getUser(jwt);
    if (!user) return json(req, { error: "Not signed in" }, 401);

    const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (!profile || !["admin", "sales"].includes((profile as { role: string }).role)) {
      return json(req, { error: "Not allowed" }, 403);
    }

    const { lead_id, subject, body } = payload;
    const subj = typeof subject === "string" ? subject.trim().slice(0, 200) : "";
    const text = typeof body === "string" ? body.trim().slice(0, 10000) : "";
    if (!lead_id || !subj || !text) return json(req, { error: "lead_id, subject and body are required" }, 422);

    const { data: lead } = await db.from("leads")
      .select("id, email, first_name").eq("id", lead_id).maybeSingle();
    const leadEmail = (lead as { email: string } | null)?.email?.trim();
    if (!leadEmail) return json(req, { error: "This lead has no email address" }, 422);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadEmail)) {
      return json(req, { error: `Invalid email address on lead: "${leadEmail}"` }, 422);
    }

    const { data: settings } = await db.from("site_settings").select("email_provider, site_name").maybeSingle();
    const siteName = (settings as { site_name?: string } | null)?.site_name ?? "GetSetSold";
    const provider = (settings as { email_provider?: "zeptomail" | "resend" } | null)?.email_provider ?? "zeptomail";

    const firstName = ((lead as { first_name: string | null }).first_name ?? "").trim();
    const rendered = text
      .replace(/\{\{\s*first_name\s*\}\}/g, firstName || "there")
      .replace(/\{\{\s*site_name\s*\}\}/g, siteName);
    const renderedSubject = subj
      .replace(/\{\{\s*first_name\s*\}\}/g, firstName || "there")
      .replace(/\{\{\s*site_name\s*\}\}/g, siteName);

    const sent = await sendEmail(leadEmail, renderedSubject, rendered, undefined, provider);
    await db.from("lead_activities").insert({
      lead_id, type: "email_out",
      body: `${renderedSubject}\n\n${rendered}`,
      created_by: user.id, meta: sent,
    });
    return json(req, { ok: true });
  } catch (e) {
    return json(req, { error: String((e as Error)?.message ?? e) }, 200);
  }
});
