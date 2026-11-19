import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Saves the phone number a homeowner leaves on the valuation-intent
 * confirmation page. POST form: token (valuation_update_sends.intent_token)
 * + phone. Only fills the lead's phone when it's currently empty — never
 * overwrites a number already on file.
 */

function page(inner: string): NextResponse {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>GetSetSold.ca</title>
<style>body{font-family:-apple-system,'Segoe UI',sans-serif;background:#f5f5f5;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
.card{background:#fff;border:1px solid #e2e2e2;border-radius:16px;padding:40px 32px;max-width:440px;text-align:center}
.brand{font-size:22px;font-weight:800;letter-spacing:-.5px;margin-bottom:16px}.brand span{color:#0099cc}
h1{font-size:22px;margin:0 0 10px}p{color:#555;font-size:14px;line-height:1.6}</style></head>
<body><div class="card"><div class="brand">GETSETSOLD<span>.ca</span></div>
${inner}</div></body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const token = String(form?.get("token") ?? "");
  const phone = String(form?.get("phone") ?? "").trim();
  const digits = phone.replace(/\D/g, "");

  if (!token || digits.length < 7 || digits.length > 15) {
    return page(`<h1>That number doesn't look right</h1>
<p>Go back and check the number, or just reply to any monthly update email with it instead.</p>`);
  }

  const cms = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: send } = await cms
    .from("valuation_update_sends")
    .select("lead_id")
    .eq("intent_token", token)
    .maybeSingle();

  if (!send?.lead_id) {
    return page(`<h1>Link not recognized</h1>
<p>This link isn't valid. You can reply to any monthly update email with your number instead.</p>`);
  }

  const { data: lead } = await cms
    .from("leads").select("phone").eq("id", send.lead_id).maybeSingle();

  if (lead && !(lead.phone ?? "").trim()) {
    await cms.from("leads").update({ phone }).eq("id", send.lead_id);
    await cms.from("lead_activities").insert({
      lead_id: send.lead_id,
      type: "valuation_intent",
      body: `Left their phone number (${phone}) on the valuation update follow-up page.`,
    });
  }

  return page(`<h1>Saved — thank you</h1>
<p>Rohit has your number now and will be in touch. Talk soon.</p>`);
}
