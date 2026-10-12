import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireStaff } from "@/lib/auth";

/**
 * POST /api/admin/leads/[id]/send-match
 * Manually push a listing to the lead via email.
 * Body: { type: "mls" | "precon", listing: {...}, note?: string }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireStaff(["admin", "editor", "sales"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const { id } = await params;
  const { type, listing, note } = await req.json();

  if (!type || !listing) return NextResponse.json({ error: "type and listing required" }, { status: 400 });

  const cms = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cms.rohit-910.workers.dev";

  const { data: lead } = await cms.from("leads").select("email, first_name").eq("id", id).single();
  const email = (lead as any)?.email?.toLowerCase().trim();
  if (!email) return NextResponse.json({ error: "Lead has no email" }, { status: 400 });
  const firstName = (lead as any)?.first_name || "there";

  let subject: string;
  let html: string;

  if (type === "mls") {
    const price = listing.isRent
      ? `$${Number(listing.price).toLocaleString()}/mo`
      : `$${Number(listing.price).toLocaleString()}`;
    subject = `${listing.address} — ${price}`;
    const listingUrl = `${siteUrl}/real-estate/${encodeURIComponent(listing.key)}`;
    html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;">
<div style="background:#0a0a1a;color:#ffffff;padding:28px 32px;">
<div style="font-size:22px;font-weight:700;">GetSetSold<span style="color:#0066cc;">.ca</span></div>
<div style="font-size:13px;color:#aaa;margin-top:6px;">Rohit Sharma, REALTOR&reg;</div>
</div>
<div style="padding:32px;">
<p style="font-size:15px;color:#555;">Hi ${firstName},</p>
${note ? `<p style="font-size:15px;color:#333;line-height:1.7;background:#f0f4fa;padding:16px;border-radius:8px;">${note}</p>` : ""}
<p style="font-size:15px;color:#333;">Thought you might like this one:</p>
<div style="border:1px solid #e8e8e8;border-radius:12px;overflow:hidden;margin:20px 0;">
${listing.photo ? `<img src="${listing.photo}" style="width:100%;height:240px;object-fit:cover;display:block;">` : ""}
<div style="padding:20px;">
<div style="font-size:22px;font-weight:800;">${price}</div>
<div style="font-size:15px;margin-top:4px;">${listing.address}</div>
<div style="font-size:13px;color:#888;">${listing.city} ${listing.mls ? `· MLS# ${listing.mls}` : ""}</div>
<div style="font-size:13px;color:#555;margin-top:8px;">${listing.beds ? `${listing.beds} bd` : ""}${listing.beds && listing.baths ? " · " : ""}${listing.baths ? `${listing.baths} ba` : ""}${listing.type ? ` · ${listing.type}` : ""}</div>
<div style="text-align:center;margin-top:16px;">
<a href="${listingUrl}" style="display:inline-block;background:#0066cc;color:#fff;text-decoration:none;padding:12px 32px;border-radius:999px;font-size:14px;font-weight:600;">View Full Details</a>
</div>
</div>
</div>
<p style="font-size:13px;color:#888;text-align:center;">Questions? Just reply to this email.</p>
</div>
</div></body></html>`;
  } else {
    // pre-con
    const price = listing.price ? `From $${Number(listing.price).toLocaleString()}` : "Price on request";
    subject = `${listing.name} — ${price}`;
    const projectUrl = listing.builderSlug
      ? `${siteUrl}/pre-construction/${listing.builderSlug}/${listing.slug}`
      : `${siteUrl}/pre-construction/${listing.slug}`;
    html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;">
<div style="background:#0a0a1a;color:#ffffff;padding:28px 32px;">
<div style="font-size:22px;font-weight:700;">GetSetSold<span style="color:#0066cc;">.ca</span></div>
<div style="font-size:13px;color:#aaa;margin-top:6px;">Rohit Sharma, REALTOR&reg;</div>
</div>
<div style="padding:32px;">
<p style="font-size:15px;color:#555;">Hi ${firstName},</p>
${note ? `<p style="font-size:15px;color:#333;line-height:1.7;background:#f0f4fa;padding:16px;border-radius:8px;">${note}</p>` : ""}
<p style="font-size:15px;color:#333;">Check out this pre-con project:</p>
<div style="border:1px solid #e8e8e8;border-radius:12px;overflow:hidden;margin:20px 0;">
${listing.image ? `<img src="${listing.image}" style="width:100%;height:240px;object-fit:cover;display:block;">` : ""}
<div style="padding:20px;">
<div style="font-size:20px;font-weight:800;">${listing.name}</div>
<div style="font-size:13px;color:#888;">${listing.builder ? `by ${listing.builder} · ` : ""}${listing.city}</div>
<div style="font-size:16px;font-weight:700;color:#0066cc;margin-top:8px;">${price}</div>
<div style="text-align:center;margin-top:16px;">
<a href="${projectUrl}" style="display:inline-block;background:#0066cc;color:#fff;text-decoration:none;padding:12px 32px;border-radius:999px;font-size:14px;font-weight:600;">View Project Details</a>
</div>
</div>
</div>
<p style="font-size:13px;color:#888;text-align:center;">Questions? Just reply to this email.</p>
</div>
</div></body></html>`;
  }

  const { error } = await cms.functions.invoke("send-email", {
    body: {
      to_email: email, subject,
      html_body: html, body: subject,
      from_email: "noreply@getsetsold.ca", reply_to: "rohit@getsetsold.ca",
    },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log to lead activities
  await cms.from("lead_activities").insert({
    lead_id: id, type: "email_out",
    body: `Sent match: ${subject}${note ? `\nNote: ${note}` : ""}`,
  });

  return NextResponse.json({ ok: true });
}
