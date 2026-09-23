// Manual SMS from the admin lead screen. Requires a signed-in admin or sales user.
import { admin, corsHeaders, json, sendSms } from "../_shared/utils.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  const db = admin();
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: { user } } = await db.auth.getUser(jwt);
  if (!user) return json(req, { error: "Not signed in" }, 401);

  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "sales"].includes(profile.role)) return json(req, { error: "Not allowed" }, 403);

  const { lead_id, body } = await req.json().catch(() => ({}));
  const text = typeof body === "string" ? body.trim().slice(0, 1200) : "";
  if (!lead_id || !text) return json(req, { error: "lead_id and body are required" }, 422);

  const { data: lead } = await db.from("leads")
    .select("id, phone, sms_opt_in, sms_opted_out").eq("id", lead_id).single();
  if (!lead?.phone) return json(req, { error: "This lead has no phone number" }, 422);
  if (lead.sms_opted_out) return json(req, { error: "This lead replied STOP" }, 422);
  if (!lead.sms_opt_in) return json(req, { error: "This lead did not consent to SMS" }, 422);

  try {
    const sent = await sendSms(lead.phone, text);
    await db.from("lead_activities").insert({ lead_id, type: "sms_out", body: text, created_by: user.id, meta: sent });
    await db.from("follow_up_queue").update({ status: "skipped" }).eq("lead_id", lead_id).eq("status", "pending");
    return json(req, { ok: true });
  } catch (e) {
    return json(req, { error: String(e) }, 502);
  }
});
