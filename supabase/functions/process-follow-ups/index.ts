// Sends due follow-ups from follow_up_queue. Called every minute by pg_cron
// and right after a lead is submitted. Auth: x-cron-secret header.
import { admin, render, sendEmail, sendSms } from "../_shared/utils.ts";

const MAX_ATTEMPTS = 3;
const STOP_STATUSES = ["qualified", "proposal", "won", "lost"];

Deno.serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }
  const db = admin();

  // Re-queue jobs stuck in "processing" (e.g. a crashed run) after 10 minutes
  await db.from("follow_up_queue").update({ status: "pending" })
    .eq("status", "processing").lt("run_at", new Date(Date.now() - 10 * 60_000).toISOString());

  const { data: due } = await db.from("follow_up_queue").select("id")
    .eq("status", "pending").lte("run_at", new Date().toISOString())
    .order("run_at").limit(25);
  if (!due?.length) return Response.json({ processed: 0 });

  // Claim the jobs so two overlapping runs never send the same message twice
  const { data: jobs } = await db.from("follow_up_queue")
    .update({ status: "processing", run_at: new Date().toISOString() })
    .in("id", due.map((d) => d.id)).eq("status", "pending")
    .select("*, lead:leads(*), sequence:follow_up_sequences(steps, is_active)");

  const { data: settings } = await db.from("site_settings").select("site_name").single();
  const results: unknown[] = [];

  for (const job of jobs ?? []) {
    const lead = job.lead;
    const step = job.sequence?.steps?.[job.step_index];
    const skip =
      !lead || !step || !job.sequence?.is_active ||
      STOP_STATUSES.includes(lead.status) ||
      (job.channel === "sms" && (!lead.phone || !lead.sms_opt_in || lead.sms_opted_out)) ||
      (job.channel === "email" && !lead.email);

    if (skip) {
      await db.from("follow_up_queue").update({ status: "skipped" }).eq("id", job.id);
      continue;
    }

    const vars = { ...lead, first_name: lead.first_name ?? "there", site_name: settings?.site_name ?? "" };
    try {
      let text = render(step.template ?? "", vars);
      let sent;
      if (job.channel === "sms") {
        text += "\nReply STOP to opt out.";
        sent = await sendSms(lead.phone, text);
      } else {
        sent = await sendEmail(lead.email, render(step.subject ?? "Thanks for reaching out", vars), text);
      }
      await db.from("follow_up_queue").update({ status: "sent", attempts: job.attempts + 1 }).eq("id", job.id);
      await db.from("lead_activities").insert({
        lead_id: lead.id, type: job.channel === "sms" ? "sms_out" : "email_out", body: text,
        meta: { ...sent, automation: true, sequence_id: job.sequence_id, step: job.step_index },
      });
      if (lead.status === "new") await db.from("leads").update({ status: "contacted" }).eq("id", lead.id);
      results.push({ id: job.id, ok: true });
    } catch (e) {
      const attempts = job.attempts + 1;
      await db.from("follow_up_queue").update({
        attempts,
        last_error: String(e),
        status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
        run_at: new Date(Date.now() + attempts * 5 * 60_000).toISOString(),
      }).eq("id", job.id);
      results.push({ id: job.id, ok: false, error: String(e) });
    }
  }
  return Response.json({ processed: results.length, results });
});
