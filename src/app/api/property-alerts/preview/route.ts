import { NextResponse } from "next/server";
import { brandedEmail } from "@/lib/emailTemplate";

/**
 * Preview the property alert email template with sample data.
 * GET /api/property-alerts/preview
 */
export async function GET() {
  const sampleMatches = [
    {
      key: "30382791",
      mls: "X1234567",
      price: 1200,
      address: "4A - 67 CAROLINE STREET S",
      city: "Hamilton",
      beds: 2,
      baths: 2,
      type: "Apartment",
      photo: "https://via.placeholder.com/536x300/cccccc/666666?text=Listing+Photo",
    },
    {
      key: "30384192",
      mls: "X1234568",
      price: 1450,
      address: "332D - 468 OTTAWA STREET",
      city: "Hamilton",
      beds: 3,
      baths: 1,
      type: "Apartment",
      photo: "https://via.placeholder.com/536x300/cccccc/666666?text=Listing+Photo",
    },
  ];

  const html = buildPreviewEmail("Hamilton · under $1,500 · over $1,000", sampleMatches, "sample-token");
  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}

function buildPreviewEmail(criteriaSummary: string, matches: any[], unsubscribeToken: string): string {
  const siteUrl = "https://cms.rohit-910.workers.dev";
  const cards = matches.map((m) => `
    <div style="margin:20px 0;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
      <img src="${m.photo}" alt="" style="width:100%;height:auto;display:block;">
      <div style="padding:16px 20px;">
        <div style="font-size:18px;font-weight:700;color:#111;">$${Number(m.price).toLocaleString()}/mo</div>
        <div style="font-size:14px;color:#333;margin:4px 0;">${m.address}, ${m.city}</div>
        <div style="font-size:13px;color:#666;">${m.beds} bd · ${m.baths} ba · ${m.type}</div>
        <a href="${siteUrl}/real-estate/${m.key}" style="display:inline-block;margin-top:12px;background:#0066cc;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;">View Listing</a>
      </div>
    </div>`).join("");

  return brandedEmail({
    kicker: "NEW LISTINGS FOR YOU",
    title: `${matches.length} new listings matching your search`,
    greeting: "Hi there,",
    bodyHtml: `
      <p style="margin:0 0 16px;">These just hit the market for your saved search:<br>
      <span style="background:#f0f4fa;padding:2px 8px;border-radius:4px;font-size:13px;">${criteriaSummary}</span></p>
      ${cards}
      <p style="margin:24px 0 0;font-size:13px;color:#666;">
        <a href="${siteUrl}/property-alerts/manage" style="color:#0066cc;">Manage your alerts</a> ·
        <a href="${siteUrl}/api/property-alerts/unsubscribe?token=${unsubscribeToken}" style="color:#0066cc;">Unsubscribe</a>
      </p>`,
    footerNote: "You're receiving this because you saved a property search on GetSetSold.ca.",
  });
}
