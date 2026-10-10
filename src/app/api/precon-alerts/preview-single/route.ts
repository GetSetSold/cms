import { NextRequest, NextResponse } from "next/server";
import { createPreconClient } from "@/lib/precon";
import { brandedEmail } from "@/lib/emailTemplate";

/**
 * Preview a single-project pre-con broadcast email.
 * GET /api/precon-alerts/preview-single?slug=<project-slug>
 */
export async function GET(req: NextRequest) {
  const siteUrl = "https://cms.rohit-910.workers.dev";
  const slug = req.nextUrl.searchParams.get("slug");

  try {
    const precon = createPreconClient();
    let query = precon.from("projects").select("*, builder:builder_id(builder_name, logo_url)");
    if (slug) query = query.eq("slug", slug);
    const { data: projects } = await query.order("created_at", { ascending: false }).limit(1);

    const p: any = projects?.[0];
    if (!p) return NextResponse.json({ error: "No project found" }, { status: 404 });

    const builderName = p.builder?.builder_name || "";
    const price = p.p_start_price ? `From $${Number(p.p_start_price).toLocaleString()}` : "Price on request";

    const html = brandedEmail({
      kicker: p.vip_release === "Yes" ? "VIP PRE-CON RELEASE" : "NEW PRE-CON PROJECT",
      title: p.project_name,
      greeting: "Hi there,",
      bodyHtml: `
        ${p.main_image_url ? `<img src="${p.main_image_url}" alt="${p.project_name}" style="width:100%;height:auto;display:block;border-radius:12px;margin:0 0 20px;">` : ""}
        ${builderName ? `<p style="font-size:13px;color:#666;margin:0 0 4px;">by <strong>${builderName}</strong></p>` : ""}
        <p style="font-size:22px;font-weight:800;color:#111;margin:0 0 8px;">${price}</p>
        <p style="font-size:14px;color:#555;margin:0 0 16px;">${p.city || ""}${p.project_status ? ` · ${p.project_status}` : ""}</p>
        ${(p.beds || p.baths || p.sqft) ? `
        <div style="display:flex;gap:24px;margin:0 0 20px;padding:16px;background:#f8f9fa;border-radius:10px;">
          ${p.beds ? `<div><div style="font-size:18px;font-weight:700;color:#111;">${p.beds}</div><div style="font-size:12px;color:#888;">Bedrooms</div></div>` : ""}
          ${p.baths ? `<div><div style="font-size:18px;font-weight:700;color:#111;">${p.baths}</div><div style="font-size:12px;color:#888;">Bathrooms</div></div>` : ""}
          ${p.sqft ? `<div><div style="font-size:18px;font-weight:700;color:#111;">${p.sqft}</div><div style="font-size:12px;color:#888;">Sq Ft</div></div>` : ""}
        </div>` : ""}
        ${p.project_description ? `<p style="font-size:14px;color:#333;line-height:1.7;margin:0 0 20px;">${p.project_description.slice(0, 400)}${p.project_description.length > 400 ? "..." : ""}</p>` : ""}
        ${p.project_message ? `<p style="font-size:14px;color:#0066cc;background:#f0f4fa;padding:12px 16px;border-radius:8px;margin:0 0 20px;">${p.project_message}</p>` : ""}
        <div style="text-align:center;margin:24px 0;">
          <a href="${siteUrl}/pre-con/${p.slug}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:999px;font-size:15px;font-weight:600;">View Full Details & Floor Plans</a>
        </div>
        <p style="font-size:13px;color:#888;text-align:center;margin:20px 0 0;">
          Questions? Reply to this email or call me directly.<br>
          <a href="${siteUrl}/pre-con" style="color:#0066cc;text-decoration:none;">Browse all pre-con projects</a>
        </p>`,
      footerNote: "You're receiving this because you subscribed to pre-con updates on GetSetSold.ca.",
    });

    return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
