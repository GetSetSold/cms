// Manual email from the admin lead screen. Requires a signed-in admin or sales user.
// Self-contained (no _shared import) so it deploys cleanly via the dashboard.
import { createClient } from "npm:@supabase/supabase-js@2";

const admin = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

function corsHeaders(req: Request) {
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "*").split(",").map((s) => s.trim());
  const origin = req.headers.get("Origin") ?? "";
  const allow = allowed.includes("*") ? "*" : allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });

function toHtml(text: string) {
  return text.split(/\n{2,}/).map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>`).join("");
}

async function sendEmailZeptoMail(to: string, subject: string, text: string) {
  const token = Deno.env.get("ZEPTOMAIL_TOKEN");
  const from = Deno.env.get("EMAIL_FROM");
  const fromName = Deno.env.get("EMAIL_FROM_NAME");
  if (!token || !from) throw new Error("ZeptoMail secrets are not set");
  const res = await fetch("https://api.zeptomail.com/v1.1/email", {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      from: { address: from, name: fromName || undefined },
      to: [{ email_address: { address: to } }],
      subject, htmlbody: toHtml(text), textbody: text,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? `ZeptoMail error ${res.status}`);
  return { provider: "zeptomail" };
}

async function sendEmailResend(to: string, subject: string, text: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");
  if (!key || !from) throw new Error("Resend secrets are not set");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text, html: toHtml(text) }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? `Resend error ${res.status}`);
  return { provider: "resend" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  try {
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

    const { data: lead } = await db.from("leads").select("id, email, first_name").eq("id", lead_id).maybeSingle();
    const leadEmail = (lead as { email: string } | null)?.email;
    if (!leadEmail) return json(req, { error: "This lead has no email address" }, 422);

    const { data: settings } = await db.from("site_settings").select("email_provider, site_name").maybeSingle();
    const siteName = (settings as { site_name?: string } | null)?.site_name ?? "GetSetSold";
    const provider = ((settings as { email_provider?: string } | null)?.email_provider ?? "zeptomail") as "zeptomail" | "resend";
    const firstName = ((lead as { first_name: string | null }).first_name ?? "").trim();

    const rendered = text
      .replace(/\{\{\s*first_name\s*\}\}/g, firstName || "there")
      .replace(/\{\{\s*site_name\s*\}\}/g, siteName);
    const renderedSubject = subj
      .replace(/\{\{\s*first_name\s*\}\}/g, firstName || "there")
      .replace(/\{\{\s*site_name\s*\}\}/g, siteName);

    const sent = provider === "resend"
      ? await sendEmailResend(leadEmail, renderedSubject, rendered)
      : await sendEmailZeptoMail(leadEmail, renderedSubject, rendered);
    await db.from("lead_activities").insert({ lead_id, type: "email_out", body: `${renderedSubject}\n\n${rendered}`, created_by: user.id, meta: sent });
    return json(req, { ok: true });
  } catch (e) {
    return json(req, { error: String((e as Error)?.message ?? e) }, 502);
  }
});
