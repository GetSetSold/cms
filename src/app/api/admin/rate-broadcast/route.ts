import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireStaff } from "@/lib/auth";
import { buildRateUpdateEmail } from "@/lib/rateEmail";

/**
 * Admin: preview + send Bank of Canada rate updates.
 * POST /api/admin/rate-broadcast { oldRate, newRate, effectiveDate, headline, commentary, test_email? }
 * GET /api/admin/rate-broadcast?preview=1&oldRate=..&newRate=..&... — returns HTML preview
 */

export async function GET(req: NextRequest) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const q = req.nextUrl.searchParams;
  if (q.get("preview") !== "1") {
    const cms = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { count } = await cms.from("rate_subscribers").select("id", { count: "exact", head: true }).eq("is_active", true);
    return NextResponse.json({ activeSubscribers: count ?? 0 });
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cms.rohit-910.workers.dev";
  const html = buildRateUpdateEmail({
    oldRate: Number(q.get("oldRate")) || 0,
    newRate: Number(q.get("newRate")) || 0,
    effectiveDate: q.get("effectiveDate") || "",
    headline: q.get("headline") || "Bank of Canada Rate Update",
    commentary: q.get("commentary") || "",
    siteUrl,
    greeting: "Hi there,",
    unsubscribeToken: "preview",
  });
  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}

export async function POST(req: NextRequest) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const body = await req.json();
  const { oldRate, newRate, effectiveDate, headline, commentary, test_email } = body;
  if (oldRate == null || newRate == null || !headline) {
    return NextResponse.json({ error: "oldRate, newRate, headline required" }, { status: 400 });
  }

  const cms = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cms.rohit-910.workers.dev";

  let recipients: { email: string; first_name: string | null; unsubscribe_token: string }[] = [];
  if (test_email) {
    recipients = [{ email: String(test_email).toLowerCase().trim(), first_name: null, unsubscribe_token: "test" }];
  } else {
    const { data, error } = await cms.from("rate_subscribers")
      .select("email, first_name, unsubscribe_token").eq("is_active", true);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    recipients = ((data ?? []) as any[]).map((s) => ({
      email: String(s.email).toLowerCase(),
      first_name: s.first_name ?? null,
      unsubscribe_token: s.unsubscribe_token,
    }));
  }

  if (!recipients.length) return NextResponse.json({ ok: true, sent: 0, failed: 0, message: "No recipients" });

  let sent = 0, failed = 0;
  const failures: { email: string; error: string }[] = [];
  for (const r of recipients) {
    const html = buildRateUpdateEmail({
      oldRate: Number(oldRate), newRate: Number(newRate),
      effectiveDate: effectiveDate || "", headline, commentary: commentary || "",
      siteUrl,
      greeting: `Hi ${r.first_name || "there"},`,
      unsubscribeToken: r.unsubscribe_token,
    });
    try {
      const { error } = await cms.functions.invoke("send-email", {
        body: {
          to_email: r.email, subject: headline,
          html_body: html, body: headline,
          from_email: "noreply@getsetsold.ca", reply_to: "rohit@getsetsold.ca",
        },
      });
      if (error) throw new Error(error.message || "send-email failed");
      sent++;
    } catch (e) {
      failed++;
      failures.push({ email: r.email, error: e instanceof Error ? e.message : "send failed" });
    }
    if (!test_email) await new Promise((r2) => setTimeout(r2, 500));
  }

  return NextResponse.json({ ok: true, sent, failed, failures: failures.slice(0, 10) });
}
