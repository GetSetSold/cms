import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * One-tap selling-intent answers from the monthly valuation update email.
 * GET /api/valuation-updates/intent?token=<intent_token>&choice=<key>
 *
 * Records the answer on the send row, logs a lead activity, and routes:
 *  - "3mo"  → same-day hot-lead alert email to Rohit + a follow-up reminder due now
 *  - "6mo"  → follow-up reminder in ~45 days
 *  - "12mo" → follow-up reminder in ~90 days
 *  - "tracking" / "none" → recorded only
 * Side effects are guarded so repeat clicks never duplicate alerts/reminders.
 * Uses the service-role client (same pattern as /api/property-alerts/check):
 * the token is the credential, so no login is needed.
 */

const CHOICES: Record<string, { label: string; thanks: string }> = {
  "3mo": {
    label: "Within 3 months",
    thanks: "Thanks — noted. Rohit will be in touch shortly to talk next steps.",
  },
  "6mo": {
    label: "3–6 months",
    thanks: "Thanks — noted. Rohit will check in closer to then, and you'll keep getting these monthly updates.",
  },
  "12mo": {
    label: "6–12 months",
    thanks: "Thanks — noted. Rohit will check in closer to then, and you'll keep getting these monthly updates.",
  },
  tracking: {
    label: "Just tracking my home's value",
    thanks: "Thanks — you'll keep getting these monthly updates.",
  },
  none: {
    label: "Not planning to sell",
    thanks: "Thanks — noted. You'll keep getting these monthly updates; if anything changes, just reply to one.",
  },
};

const SELLING = new Set(["3mo", "6mo", "12mo"]);
const AGENT_EMAIL = "rohit@getsetsold.ca";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtMoney(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-CA");
}

function page(title: string, inner: string): NextResponse {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(title)} — GetSetSold.ca</title>
<style>body{font-family:-apple-system,'Segoe UI',sans-serif;background:#f5f5f5;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
.card{background:#fff;border:1px solid #e2e2e2;border-radius:16px;padding:40px 32px;max-width:440px;text-align:center}
.brand{font-size:22px;font-weight:800;letter-spacing:-.5px;margin-bottom:16px}.brand span{color:#0099cc}
h1{font-size:22px;margin:0 0 10px}p{color:#555;font-size:14px;line-height:1.6}
.est{font-size:26px;font-weight:800;color:#14142B;margin:14px 0 2px}
.btn{display:inline-block;margin-top:14px;padding:11px 22px;background:#0099cc;color:#fff;text-decoration:none;border-radius:999px;font-weight:600;font-size:14px}
form{margin-top:18px}input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #ccc;border-radius:10px;font-size:15px}
button{margin-top:10px;width:100%;padding:11px;background:#14142B;color:#fff;border:0;border-radius:999px;font-weight:600;font-size:14px;cursor:pointer}
.small{font-size:12px;color:#888}</style></head>
<body><div class="card"><div class="brand">GETSETSOLD<span>.ca</span></div>
${inner}</div></body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const choice = req.nextUrl.searchParams.get("choice") ?? "";
  const picked = CHOICES[choice];

  if (!token || !picked) {
    return page("Link not recognized", `<h1>Link not recognized</h1>
<p>This link isn't valid. If you'd like to update your answer, reply to any monthly update email or call (416) 605-7488.</p>`);
  }

  const cms = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: send } = await cms
    .from("valuation_update_sends")
    .select("id, report_id, lead_id, new_value, old_value, intent_choice, intent_alert_sent, intent_actioned_at")
    .eq("intent_token", token)
    .maybeSingle();

  if (!send) {
    return page("Link not recognized", `<h1>Link not recognized</h1>
<p>This link isn't valid. If you'd like to update your answer, reply to any monthly update email or call (416) 605-7488.</p>`);
  }

  const [{ data: report }, { data: lead }] = await Promise.all([
    cms.from("valuation_reports")
      .select("address, city, price_low, price_high, recommended_price, share_token, share_revoked, share_expires_at")
      .eq("id", send.report_id).maybeSingle(),
    send.lead_id
      ? cms.from("leads").select("first_name, last_name, email, phone").eq("id", send.lead_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const firstName = (lead?.first_name ?? "").trim();
  const fullName = [lead?.first_name, lead?.last_name].filter(Boolean).join(" ").trim() || "A homeowner";
  const address = report?.address ?? "";
  const city = report?.city ?? "";
  const nowIso = new Date().toISOString();
  const changed = send.intent_choice !== choice;

  // Record the latest answer.
  await cms.from("valuation_update_sends")
    .update({ intent_choice: choice, intent_at: nowIso })
    .eq("id", send.id);

  // Lead activity trail (first answer, or when the answer changes).
  if (send.lead_id && (!send.intent_choice || changed)) {
    await cms.from("lead_activities").insert({
      lead_id: send.lead_id,
      type: "valuation_intent",
      body: `Monthly valuation update — ${fullName} answered "Are you thinking of selling?": ${picked.label}. Property: ${address}${city ? `, ${city}` : ""}.`,
    });
  }

  // Follow-up routing (guarded against duplicate clicks).
  const patch: Record<string, unknown> = {};
  if (choice === "3mo" && !send.intent_alert_sent) {
    const range = report?.price_low && report?.price_high
      ? `${fmtMoney(report.price_low)} – ${fmtMoney(report.price_high)}`
      : report?.recommended_price
        ? fmtMoney(report.recommended_price)
        : "—";
    const phoneLine = lead?.phone?.trim() ? lead.phone.trim() : "No phone on file — reply by email";
    const text =
`${fullName} answered your monthly valuation update: they're thinking of selling WITHIN 3 MONTHS.

Property: ${address}${city ? `, ${city}` : ""}
Phone: ${phoneLine}
Email: ${lead?.email ?? "—"}
Original valuation range: ${range}
Current HPI estimate: ${send.new_value ? `~${fmtMoney(Number(send.new_value))}` : "—"}

Call them today.`;
    try {
      await cms.functions.invoke("send-email", {
        body: {
          to_email: AGENT_EMAIL,
          subject: `Selling within 3 months — ${fullName}, ${address}`,
          body: text,
          from_email: "noreply@getsetsold.ca",
          reply_to: lead?.email ?? AGENT_EMAIL,
        },
      });
    } catch {
      // The reminder below still lands in the CRM even if the email fails.
    }
    if (send.lead_id) {
      await cms.from("lead_reminders").insert({
        lead_id: send.lead_id,
        remind_at: nowIso,
        note: `Hot lead — thinking of selling within 3 months (valuation update). ${address}${city ? `, ${city}` : ""}. Call today.`,
      });
    }
    patch.intent_alert_sent = true;
    patch.intent_actioned_at = nowIso;
  } else if (choice === "6mo" && !send.intent_actioned_at) {
    if (send.lead_id) {
      await cms.from("lead_reminders").insert({
        lead_id: send.lead_id,
        remind_at: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        note: `Thinking of selling in 3–6 months (valuation update). ${address}${city ? `, ${city}` : ""}.`,
      });
    }
    patch.intent_actioned_at = nowIso;
  } else if (choice === "12mo" && !send.intent_actioned_at) {
    if (send.lead_id) {
      await cms.from("lead_reminders").insert({
        lead_id: send.lead_id,
        remind_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        note: `Thinking of selling in 6–12 months (valuation update). ${address}${city ? `, ${city}` : ""}.`,
      });
    }
    patch.intent_actioned_at = nowIso;
  }
  if (Object.keys(patch).length) {
    await cms.from("valuation_update_sends").update(patch).eq("id", send.id);
  }

  // Confirmation page: current estimate + honest framing + optional phone ask.
  const shareOk = report?.share_token && !report.share_revoked &&
    (!report.share_expires_at || new Date(report.share_expires_at) > new Date());
  const needsPhone = SELLING.has(choice) && !(lead?.phone ?? "").trim();

  const inner = `<h1>Thanks${firstName ? `, ${esc(firstName)}` : ""}</h1>
<p>${esc(picked.thanks)}</p>
<p>Your answer: <strong>${esc(picked.label)}</strong></p>
${send.new_value ? `<div class="est">~${fmtMoney(Number(send.new_value))}</div>
<p>Estimated value of ${esc(address)} now, based on the MLS® Home Price Index trend for your area — not a new appraisal. The real number comes from a walkthrough of your home.</p>` : ""}
${shareOk ? `<a class="btn" href="/shared/valuation/${esc(report!.share_token!)}">See your full valuation report</a>` : ""}
${needsPhone ? `<form method="POST" action="/api/valuation-updates/intent-phone">
<input type="hidden" name="token" value="${esc(token)}"/>
<p style="margin-bottom:8px">Best phone number for Rohit to reach you?</p>
<input type="tel" name="phone" autocomplete="tel" placeholder="(416) 555-0123" required/>
<button type="submit">Save my number</button>
<p class="small">Only used to follow up about your home — no spam.</p></form>` : ""}`;

  return page("Thanks", inner);
}
