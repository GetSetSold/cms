import { createClient } from "npm:@supabase/supabase-js@2";

export const admin = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

export function corsHeaders(req: Request) {
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

export const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });

/** Normalise to E.164. Numbers without a country code get DEFAULT_COUNTRY_CODE (default 1). */
export function toE164(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const hasPlus = raw.trim().startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  if (hasPlus) return `+${digits}`;
  const cc = Deno.env.get("DEFAULT_COUNTRY_CODE") ?? "1";
  if (cc === "1" && digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${cc}${digits}`;
}

/** "Hi {{first_name}}" -> "Hi Sam" (missing values collapse cleanly) */
export const render = (tpl: string, vars: Record<string, unknown>) =>
  tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => String(vars[k] ?? "")).replace(/ +,/g, ",");

async function sendSmsVonage(to: string, body: string) {
  // Vonage's classic SMS API: simple api_key/api_secret auth (no JWT to sign), form-encoded body.
  // Still fully supported alongside their newer unified Messages API.
  const apiKey = Deno.env.get("VONAGE_API_KEY");
  const apiSecret = Deno.env.get("VONAGE_API_SECRET");
  const from = Deno.env.get("VONAGE_FROM");
  if (!apiKey || !apiSecret || !from) throw new Error("Vonage secrets are not set");
  const res = await fetch("https://rest.nexmo.com/sms/json", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ api_key: apiKey, api_secret: apiSecret, from, to: to.replace(/^\+/, ""), text: body }),
  });
  const data = await res.json();
  const msg = data.messages?.[0];
  // Vonage returns HTTP 200 even for a failed send — the real status is per-message ("0" = success).
  if (!res.ok || !msg || msg.status !== "0") throw new Error(msg?.["error-text"] ?? `Vonage error ${res.status}`);
  return { provider: "vonage", provider_id: msg["message-id"] as string };
}

async function sendSmsTwilio(to: string, body: string) {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_FROM");
  if (!sid || !token || !from) throw new Error("Twilio secrets are not set");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(`${sid}:${token}`), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? `Twilio error ${res.status}`);
  return { provider: "twilio", provider_id: data.sid as string };
}

/** `provider` comes from site_settings.sms_provider (fetched by the caller — this function has no
 *  DB access of its own). Defaults to Vonage so any call site that doesn't pass one keeps working. */
export async function sendSms(to: string, body: string, provider: "vonage" | "twilio" = "vonage") {
  return provider === "twilio" ? sendSmsTwilio(to, body) : sendSmsVonage(to, body);
}

/** The branded HTML wrapper from the design mockup: dark navy header, a small cobalt eyebrow label,
 *  the subject as a bold heading, body paragraphs, an optional CTA button, and an agent/brokerage
 *  signature footer. `text` is plain — blank-line-separated paragraphs, same as the plain layout. */
export function brandedEmailHtml(opts: {
  subject: string; text: string; siteName: string; brokerage?: string;
  eyebrow?: string; ctaLabel?: string; ctaHref?: string; agentName?: string;
}): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const paragraphs = opts.text.split(/\n{2,}/).map((p) => `<p style="margin:0 0 16px;color:#3a3a44;font-size:15px;line-height:1.6">${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  const cta = opts.ctaLabel && opts.ctaHref
    ? `<a href="${esc(opts.ctaHref)}" style="display:inline-block;margin-top:8px;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:999px;font-weight:600;font-size:14px">${esc(opts.ctaLabel)}</a>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f4f6;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
<table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff"><tr><td>
  <div style="background:#14142B;color:#fff;padding:24px 28px">
    <div style="font-weight:700;font-size:18px">${esc(opts.siteName)}</div>
    ${opts.brokerage ? `<div style="font-size:11px;letter-spacing:.04em;opacity:.7;text-transform:uppercase;margin-top:2px">${esc(opts.brokerage)}</div>` : ""}
  </div>
  <div style="padding:32px 28px">
    ${opts.eyebrow ? `<div style="color:#2563eb;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:8px">${esc(opts.eyebrow)}</div>` : ""}
    <h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;color:#14142B">${esc(opts.subject)}</h1>
    ${paragraphs}
    ${cta}
  </div>
  ${opts.agentName ? `<div style="padding:20px 28px;border-top:1px solid #eee;font-size:13px;color:#6b7280">${esc(opts.agentName)}${opts.brokerage ? `<br>${esc(opts.brokerage)}` : ""}</div>` : ""}
  <div style="padding:14px 28px;font-size:11px;color:#9ca3af">You're receiving this message because you requested real estate information.</div>
</td></tr></table>
</body></html>`;
}

function toHtml(text: string) {
  return text.split(/\n{2,}/).map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>`).join("");
}

export interface EmailAttachment { name: string; content: string; mime_type: string; }

async function sendEmailZeptoMail(to: string | string[], subject: string, text: string, html?: string, attachments?: EmailAttachment[]) {
  const token = Deno.env.get("ZEPTOMAIL_TOKEN"); // "Zoho-enczapikey <send mail token>"
  const from = Deno.env.get("EMAIL_FROM");
  const fromName = Deno.env.get("EMAIL_FROM_NAME");
  if (!token || !from) throw new Error("ZeptoMail secrets are not set");
  const recipients = (Array.isArray(to) ? to : [to]).map((address) => ({ email_address: { address } }));
  const res = await fetch("https://api.zeptomail.com/v1.1/email", {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ from: { address: from, name: fromName || undefined }, to: recipients, subject, htmlbody: html ?? toHtml(text), textbody: text, attachments: attachments?.map((a) => ({ name: a.name, content: a.content, mime_type: a.mime_type })) }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? data.error?.details?.[0]?.message ?? `ZeptoMail error ${res.status}`);
  return { provider: "zeptomail", provider_id: (data.data?.[0]?.additional_info?.[0]?.message_id ?? data.request_id ?? "") as string };
}

async function sendEmailResend(to: string | string[], subject: string, text: string, html?: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");
  if (!key || !from) throw new Error("Resend secrets are not set");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text, html: html ?? toHtml(text) }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? `Resend error ${res.status}`);
  return { provider: "resend", provider_id: data.id as string };
}

/** `provider` comes from site_settings.email_provider (fetched by the caller — this function has no
 *  DB access of its own). Defaults to ZeptoMail so any call site that doesn't pass one keeps working. */
export async function sendEmail(to: string | string[], subject: string, text: string, html?: string, provider: "zeptomail" | "resend" = "zeptomail", attachments?: EmailAttachment[]) {
  return provider === "resend" ? sendEmailResend(to, subject, text, html) : sendEmailZeptoMail(to, subject, text, html, attachments);
}
