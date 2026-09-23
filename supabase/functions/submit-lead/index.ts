// Public endpoint for website forms. Validates, blocks spam, saves the lead,
// queues the follow-up sequence and notifies staff.
import { admin, corsHeaders, json, sendEmail, toE164 } from "../_shared/utils.ts";

const clip = (v: unknown, n: number) =>
  (typeof v === "string" ? v.trim().slice(0, n) : "") || null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  let body: Record<string, any>;
  try { body = await req.json(); } catch { return json(req, { error: "Invalid JSON" }, 400); }

  if (body.website) return json(req, { ok: true });                              // honeypot field
  if (Number(body.elapsed_ms ?? 99999) < 1500) return json(req, { ok: true });  // filled too fast

  const email = clip(body.email, 200)?.toLowerCase() ?? null;
  const phone = toE164(body.phone);
  if (!email && !phone) return json(req, { error: "Please enter an email or phone number." }, 422);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(req, { error: "Please check your email address." }, 422);
  }

  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET");
  if (turnstileSecret) {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret: turnstileSecret, response: String(body.captcha_token ?? "") }),
    }).then((r) => r.json());
    if (!r.success) return json(req, { error: "Spam check failed, please try again." }, 400);
  }

  const db = admin();
  const name = clip(body.name, 200) ?? "";
  const [first, ...rest] = name.split(/\s+/);

  const { data: lead, error } = await db.from("leads").insert({
    first_name: clip(body.first_name, 100) ?? (first || null),
    last_name: clip(body.last_name, 100) ?? (rest.join(" ") || null),
    email,
    phone,
    company: clip(body.company, 200),
    message: clip(body.message, 5000),
    service: clip(body.service, 200),
    form_key: clip(body.form_key, 60) ?? "contact",
    source_page: typeof body.page_id === "string" && /^[0-9a-f-]{36}$/.test(body.page_id) ? body.page_id : null,
    source_path: clip(body.path, 500),
    utm: body.utm && typeof body.utm === "object" ? body.utm : {},
    sms_opt_in: Boolean(body.sms_opt_in) && Boolean(phone),
  }).select().single();

  if (error) {
    console.error(error);
    return json(req, { error: "Could not save your request. Please call us instead." }, 500);
  }

  await db.from("lead_activities").insert({
    lead_id: lead.id, type: "system", body: `Lead captured via ${lead.form_key} form`,
    meta: { path: lead.source_path, utm: lead.utm, sms_opt_in: lead.sms_opt_in },
  });

  // Queue every step of the matching active sequences
  const { data: sequences } = await db.from("follow_up_sequences").select("*")
    .eq("is_active", true).eq("trigger", "lead_created");
  const now = Date.now();
  const queue = (sequences ?? [])
    .filter((s) => !s.form_key || s.form_key === lead.form_key)
    .flatMap((s) => (s.steps as any[]).map((step, i) => ({
      lead_id: lead.id, sequence_id: s.id, step_index: i, channel: step.channel,
      run_at: new Date(now + (Number(step.delay_minutes) || 0) * 60_000).toISOString(),
    })));
  if (queue.length) await db.from("follow_up_queue").insert(queue);

  // Notify staff (best effort)
  const { data: settings } = await db.from("site_settings").select("lead_settings").single();
  const notify: string[] = settings?.lead_settings?.notify_emails ?? [];
  if (notify.length) {
    sendEmail(notify, `New lead: ${name || email || phone}`,
      `Form: ${lead.form_key}\nName: ${name || "-"}\nEmail: ${email ?? "-"}\nPhone: ${phone ?? "-"}\nPage: ${lead.source_path ?? "-"}\n\n${lead.message ?? ""}`)
      .catch((e) => console.error("notify failed", e));
  }

  // Send "immediately" steps now instead of waiting for the next cron tick
  const cron = Deno.env.get("CRON_SECRET");
  if (cron) {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/process-follow-ups`, {
      method: "POST", headers: { "x-cron-secret": cron },
    }).catch(() => {});
  }

  return json(req, { ok: true });
});
