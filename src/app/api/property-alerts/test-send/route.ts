import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { brandedEmail } from "@/lib/emailTemplate";

/**
 * Send a test property alert email to a lead (for previewing in real email clients).
 * POST /api/property-alerts/test-send { email }
 */
export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const cms = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find the lead by email.
  const { data: lead } = await cms
    .from("leads")
    .select("id, email, first_name")
    .ilike("email", email)
    .limit(1)
    .single();

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const siteUrl = "https://cms.rohit-910.workers.dev";
  const html = brandedEmail({
    kicker: "NEW LISTINGS FOR YOU",
    title: "2 new listings matching your search",
    greeting: `Hi ${lead.first_name || "there"},`,
    bodyHtml: `
      <p style="margin:0 0 16px;">These just hit the market for your saved search:<br>
      <span style="background:#f0f4fa;padding:2px 8px;border-radius:4px;font-size:13px;">Hamilton · under $1,500 · over $1,000</span></p>
      <div style="margin:20px 0;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
        <div style="padding:16px 20px;">
          <div style="font-size:18px;font-weight:700;color:#111;">$1,200/mo</div>
          <div style="font-size:14px;color:#333;margin:4px 0;">4A - 67 CAROLINE STREET S, Hamilton</div>
          <div style="font-size:13px;color:#666;">2 bd · 2 ba · Apartment</div>
          <a href="${siteUrl}/listings" style="display:inline-block;margin-top:12px;background:#0066cc;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;">View Listing</a>
        </div>
      </div>
      <p style="margin:24px 0 0;font-size:13px;color:#666;">
        <a href="${siteUrl}/property-alerts/manage" style="color:#0066cc;">Manage your alerts</a> ·
        <a href="${siteUrl}/property-alerts" style="color:#0066cc;">Unsubscribe</a>
      </p>`,
    footerNote: "You're receiving this because you saved a property search on GetSetSold.ca.",
  });

  const { data, error } = await cms.functions.invoke("send-email", {
    body: { lead_id: lead.id, subject: "Test: 2 new listings matching your search", body: html },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sent: true, to: email });
}
