import { NextResponse } from "next/server";
import { createPreconClient } from "@/lib/precon";
import { brandedEmail } from "@/lib/emailTemplate";

/**
 * Preview the pre-con alert email template with real project data.
 * GET /api/precon-alerts/preview
 */
export async function GET() {
  const siteUrl = "https://cms.rohit-910.workers.dev";
  
  try {
    const precon = createPreconClient();
    const { data: projects } = await precon
      .from("projects")
      .select("*, builder:builder_id(builder_name, logo_url)")
      .order("created_at", { ascending: false })
      .limit(3);

    const list = projects ?? [];
    
    const cards = list.map((p: any) => {
      const builderName = p.builder?.builder_name || "";
      const price = p.p_start_price ? `From $${Number(p.p_start_price).toLocaleString()}` : "Price on request";
      return `
      <div style="margin:0 0 16px;border:1px solid #e8e8e8;border-radius:16px;overflow:hidden;background:#ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
        ${p.main_image_url ? `<img src="${p.main_image_url}" alt="${p.project_name}" style="width:100%;height:200px;object-fit:cover;display:block;">` : ""}
        <div style="padding:18px 20px;">
          ${p.vip_release === "Yes" ? `<span style="display:inline-block;background:#0066cc;color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;letter-spacing:0.5px;margin-bottom:8px;">VIP RELEASE</span>` : ""}
          <div style="font-size:20px;font-weight:800;color:#111;letter-spacing:-0.3px;">${p.project_name}</div>
          ${builderName ? `<div style="font-size:13px;color:#666;margin-top:2px;">by ${builderName}</div>` : ""}
          <div style="font-size:14px;color:#1a1a1a;margin:8px 0 2px;font-weight:600;">${price}</div>
          <div style="font-size:13px;color:#888;">${p.city || ""}${p.project_status ? ` · ${p.project_status}` : ""}</div>
          ${p.beds || p.baths || p.sqft ? `
          <div style="display:flex;gap:16px;margin-top:10px;padding-top:12px;border-top:1px solid #f0f0f0;">
            ${p.beds ? `<span style="font-size:13px;color:#555;"><strong style="color:#111;">${p.beds}</strong> beds</span>` : ""}
            ${p.baths ? `<span style="font-size:13px;color:#555;"><strong style="color:#111;">${p.baths}</strong> baths</span>` : ""}
            ${p.sqft ? `<span style="font-size:13px;color:#555;">${p.sqft} sqft</span>` : ""}
          </div>` : ""}
          <a href="${siteUrl}/pre-con/${p.slug}" style="display:inline-block;margin-top:14px;background:#111111;color:#ffffff;text-decoration:none;padding:10px 28px;border-radius:999px;font-size:14px;font-weight:600;">View Project</a>
        </div>
      </div>`;
    }).join("");

    const html = brandedEmail({
      kicker: "NEW PRE-CON PROJECTS",
      title: `${list.length} new pre-con ${list.length === 1 ? "project" : "projects"} for you`,
      greeting: "Hi there,",
      bodyHtml: `
        <p style="margin:0 0 20px;">New pre-construction projects just launched:</p>
        ${cards}
        <p style="margin:24px 0 0;font-size:13px;color:#888;text-align:center;">
          <a href="${siteUrl}/pre-con" style="color:#0066cc;text-decoration:none;">Browse all pre-con</a>
          <span style="color:#ccc;margin:0 8px;">·</span>
          <a href="${siteUrl}/property-alerts/manage" style="color:#0066cc;text-decoration:none;">Manage alerts</a>
        </p>`,
      footerNote: "You're receiving this because you subscribed to pre-con updates on GetSetSold.ca.",
    });

    return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
