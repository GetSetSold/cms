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
      isRent: true,
      photo: "https://via.placeholder.com/536x300/cccccc/666666?text=Listing+Photo+1",
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
      isRent: true,
      photo: "https://via.placeholder.com/536x300/bbbbbb/666666?text=Listing+Photo+2",
    },
    {
      key: "30385193",
      mls: "X1234569",
      price: 1350,
      address: "15 - 120 KING STREET W",
      city: "Hamilton",
      beds: 2,
      baths: 1,
      type: "Condo",
      isRent: true,
      photo: "https://via.placeholder.com/536x300/aaaaaa/666666?text=Listing+Photo+3",
    },
    {
      key: "30386194",
      mls: "X1234570",
      price: 1100,
      address: "8 - 45 MAIN STREET E",
      city: "Hamilton",
      beds: 1,
      baths: 1,
      type: "Apartment",
      isRent: true,
      photo: "https://via.placeholder.com/536x300/999999/666666?text=Listing+Photo+4",
    },
    {
      key: "30387195",
      mls: "X1234571",
      price: 1495,
      address: "22 - 78 JAMES STREET N",
      city: "Hamilton",
      beds: 3,
      baths: 2,
      type: "Townhouse",
      isRent: true,
      photo: "https://via.placeholder.com/536x300/888888/666666?text=Listing+Photo+5",
    },
    {
      key: "30388196",
      mls: "X1234572",
      price: 1250,
      address: "5 - 200 BARTON STREET E",
      city: "Hamilton",
      beds: 2,
      baths: 2,
      type: "Apartment",
      isRent: true,
      photo: "https://via.placeholder.com/536x300/777777/666666?text=Listing+Photo+6",
    },
    {
      key: "30389197",
      mls: "X1234573",
      price: 1400,
      address: "11 - 90 CANNON STREET E",
      city: "Hamilton",
      beds: 2,
      baths: 1,
      type: "Loft",
      isRent: true,
      photo: "https://via.placeholder.com/536x300/666666/ffffff?text=Listing+Photo+7",
    },
    {
      key: "30390198",
      mls: "X1234574",
      price: 1300,
      address: "3 - 55 VICTORIA AVE N",
      city: "Hamilton",
      beds: 3,
      baths: 1,
      type: "House",
      isRent: true,
      photo: "https://via.placeholder.com/536x300/555555/ffffff?text=Listing+Photo+8",
    },
  ];

  const html = buildPreviewEmail("Hamilton · under $1,500 · over $1,000", sampleMatches, "sample-token");
  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}

function buildPreviewEmail(criteriaSummary: string, matches: any[], unsubscribeToken: string): string {
  const siteUrl = "https://cms.rohit-910.workers.dev";
  const maxShow = 6;
  const shown = matches.slice(0, maxShow);
  const remaining = matches.length - shown.length;
  
  const cards = shown.map((m) => `
    <div style="margin:0 0 16px;border:1px solid #e8e8e8;border-radius:16px;overflow:hidden;background:#ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
      <div style="position:relative;">
        <img src="${m.photo}" alt="" style="width:100%;height:200px;object-fit:cover;display:block;">
        <span style="position:absolute;top:12px;left:12px;background:rgba(0,0,0,0.75);color:#fff;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;letter-spacing:0.5px;">${m.isRent ? "FOR RENT" : "FOR SALE"}</span>
      </div>
      <div style="padding:18px 20px;">
        <div style="font-size:20px;font-weight:800;color:#111;letter-spacing:-0.3px;">$${Number(m.price).toLocaleString()}${m.isRent ? "<span style='font-size:14px;font-weight:500;color:#666;'>/mo</span>" : ""}</div>
        <div style="font-size:14px;color:#1a1a1a;margin:6px 0 2px;font-weight:500;">${m.address}</div>
        <div style="font-size:13px;color:#888;">${m.city}</div>
        <div style="display:flex;gap:16px;margin-top:10px;padding-top:12px;border-top:1px solid #f0f0f0;">
          ${m.beds ? `<span style="font-size:13px;color:#555;"><strong style="color:#111;">${m.beds}</strong> bd</span>` : ""}
          ${m.baths ? `<span style="font-size:13px;color:#555;"><strong style="color:#111;">${m.baths}</strong> ba</span>` : ""}
          ${m.type ? `<span style="font-size:13px;color:#555;">${m.type}</span>` : ""}
        </div>
        <a href="${siteUrl}/real-estate/${m.key}" style="display:inline-block;margin-top:14px;background:#111111;color:#ffffff;text-decoration:none;padding:10px 28px;border-radius:999px;font-size:14px;font-weight:600;">View Listing</a>
      </div>
    </div>`).join("");

  const viewAll = remaining > 0 ? `
    <div style="text-align:right;margin:8px 0 16px;">
      <a href="${siteUrl}/listings" style="display:inline-block;background:#f5f5f5;color:#111;text-decoration:none;padding:10px 24px;border-radius:999px;font-size:14px;font-weight:600;border:1px solid #e0e0e0;">View all ${matches.length} listings →</a>
    </div>` : "";

  return brandedEmail({
    kicker: "NEW LISTINGS FOR YOU",
    title: `${matches.length} new ${matches.length === 1 ? "listing" : "listings"} matching your search`,
    greeting: "Hi there,",
    bodyHtml: `
      <p style="margin:0 0 20px;">These just hit the market for your saved search:<br>
      <span style="background:#f0f4fa;padding:4px 10px;border-radius:6px;font-size:13px;font-weight:500;">${criteriaSummary}</span></p>
      ${cards}
      ${viewAll}
      <p style="margin:24px 0 0;font-size:13px;color:#888;text-align:center;">
        <a href="${siteUrl}/property-alerts/manage" style="color:#0066cc;text-decoration:none;">Manage your alerts</a>
        <span style="color:#ccc;margin:0 8px;">·</span>
        <a href="${siteUrl}/api/property-alerts/unsubscribe?token=${unsubscribeToken}" style="color:#0066cc;text-decoration:none;">Unsubscribe</a>
      </p>`,
    footerNote: "You're receiving this because you saved a property search on GetSetSold.ca.",
  });
}
