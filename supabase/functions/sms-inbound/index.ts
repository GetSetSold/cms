// Twilio "A message comes in" webhook. In Twilio set it to (HTTP POST):
//   https://<project-ref>.supabase.co/functions/v1/sms-inbound
// and put that exact URL in the TWILIO_WEBHOOK_URL secret.
import { admin } from "../_shared/utils.ts";

const twiml = () =>
  new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    headers: { "Content-Type": "text/xml" },
  });

async function validTwilioSignature(req: Request, params: URLSearchParams) {
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const url = Deno.env.get("TWILIO_WEBHOOK_URL");
  const sig = req.headers.get("X-Twilio-Signature");
  if (!token || !url || !sig) return false;
  const data = url + [...new Set(params.keys())].sort().map((k) => k + params.get(k)).join("");
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(token), { name: "HMAC", hash: "SHA-1" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(mac))) === sig;
}

Deno.serve(async (req) => {
  const params = new URLSearchParams(await req.text());
  if (!(await validTwilioSignature(req, params))) return new Response("Forbidden", { status: 403 });

  const from = params.get("From") ?? "";
  const body = (params.get("Body") ?? "").trim();
  const keyword = body.toUpperCase();
  const db = admin();

  const { data: lead } = await db.from("leads").select("id").eq("phone", from)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!lead) return twiml();

  await db.from("lead_activities").insert({ lead_id: lead.id, type: "sms_in", body, meta: { from } });

  if (["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(keyword)) {
    await db.from("leads").update({ sms_opted_out: true }).eq("phone", from);
  } else if (["START", "UNSTOP"].includes(keyword)) {
    await db.from("leads").update({ sms_opted_out: false }).eq("phone", from);
  }

  // A reply means a person should take over: stop pending automation for this lead
  await db.from("follow_up_queue").update({ status: "skipped" })
    .eq("lead_id", lead.id).eq("status", "pending");

  return twiml();
});
