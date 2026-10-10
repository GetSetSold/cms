import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createMlsClient, rawCitiesFor } from "@/lib/mls";
import { brandedEmail } from "@/lib/emailTemplate";

/**
 * Send a REAL test property alert with actual MLS listings (for previewing with images).
 * POST /api/property-alerts/test-send-real { email }
 */
export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const cms = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: lead } = await cms
    .from("leads")
    .select("id, email, first_name")
    .ilike("email", email)
    .limit(1)
    .single();

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  // Fetch real Hamilton rentals $1000-$1500 from MLS.
  const mls = createMlsClient();
  const variants = await rawCitiesFor("Hamilton").catch(() => ["Hamilton"]);
  
  const { data: listings } = await mls
    .from("grid")
    .select("ListingKey, ListingId, ListPrice, TotalActualRent, UnparsedAddress, City, BedroomsTotal, BathroomsTotalInteger, StructureTypeText, Media")
    .in("City", variants)
    .not("TotalActualRent", "is", null)
    .gte("TotalActualRent", 1000)
    .lte("TotalActualRent", 1500)
    .limit(3);

  if (!listings || listings.length === 0) {
    return NextResponse.json({ error: "No matching listings found" }, { status: 404 });
  }

  const siteUrl = "https://cms.rohit-910.workers.dev";
  const cards = listings.map((m: any) => {
    const price = m.TotalActualRent ?? m.ListPrice;
    return `
    <div style="margin:20px 0;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
      ${m.Media ? `<img src="${m.Media}" alt="" style="width:100%;height:auto;display:block;">` : ""}
      <div style="padding:16px 20px;">
        <div style="font-size:18px;font-weight:700;color:#111;">$${Number(price).toLocaleString()}/mo</div>
        <div style="font-size:14px;color:#333;margin:4px 0;">${m.UnparsedAddress}, ${m.City}</div>
        <div style="font-size:13px;color:#666;">${m.BedroomsTotal ? `${m.BedroomsTotal} bd` : ""}${m.BedroomsTotal && m.BathroomsTotalInteger ? " · " : ""}${m.BathroomsTotalInteger ? `${m.BathroomsTotalInteger} ba` : ""}${m.StructureTypeText ? ` · ${m.StructureTypeText}` : ""}</div>
        <div style="font-size:12px;color:#999;margin-top:4px;">MLS# ${m.ListingId}</div>
        <a href="${siteUrl}/real-estate/${encodeURIComponent(m.ListingKey)}" style="display:inline-block;margin-top:12px;background:#0066cc;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;">View Listing</a>
      </div>
    </div>`;
  }).join("");

  const html = brandedEmail({
    kicker: "NEW LISTINGS FOR YOU",
    title: `${listings.length} new ${listings.length === 1 ? "listing" : "listings"} matching your search`,
    greeting: `Hi ${lead.first_name || "there"},`,
    bodyHtml: `
      <p style="margin:0 0 16px;">These just hit the market for your saved search:<br>
      <span style="background:#f0f4fa;padding:2px 8px;border-radius:4px;font-size:13px;">Hamilton · under $1,500 · over $1,000</span></p>
      ${cards}
      <p style="margin:24px 0 0;font-size:13px;color:#666;">
        <a href="${siteUrl}/property-alerts/manage" style="color:#0066cc;">Manage your alerts</a> ·
        <a href="${siteUrl}/property-alerts" style="color:#0066cc;">Unsubscribe</a>
      </p>`,
    footerNote: "You're receiving this because you saved a property search on GetSetSold.ca.",
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceKey}`,
      "apikey": serviceKey,
    },
    body: JSON.stringify({
      lead_id: lead.id,
      subject: `Test: ${listings.length} real listings matching your search`,
      body: html,
      from_email: "noreply@getsetsold.ca",
      reply_to: "rohit@getsetsold.ca",
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json({ error: `Function returned ${res.status}`, details: data }, { status: 500 });
  }
  return NextResponse.json({ sent: true, to: email, count: listings.length });
}
