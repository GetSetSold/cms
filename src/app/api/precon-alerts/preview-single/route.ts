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

    // Fetch promos (incentives) and top models for this project.
    const { data: promos } = await precon
      .from("promos")
      .select("title, description, badge, bullets")
      .eq("project_id", p.id)
      .eq("show", true)
      .limit(3);

    const { data: models } = await precon
      .from("home_models")
      .select("model_name, bedrooms, bathrooms, sqft, starting_price, model_image_url, slug")
      .eq("project_id", p.id)
      .limit(2);

    const builderName = p.builder?.builder_name || "";
    const price = p.p_start_price ? `From $${Number(p.p_start_price).toLocaleString()}` : "Price on request";

    const promoHtml = (promos ?? []).map((promo: any) => `
      <div style="background:#fff8e1;border:1px solid #ffe082;border-radius:10px;padding:14px 16px;margin:0 0 12px;">
        ${promo.badge ? `<span style="display:inline-block;background:#f57f17;color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:12px;margin-bottom:6px;">${promo.badge}</span>` : ""}
        <div style="font-size:15px;font-weight:700;color:#111;">${promo.title || ""}</div>
        ${promo.description ? `<div style="font-size:13px;color:#555;margin-top:4px;">${promo.description}</div>` : ""}
        ${(promo.bullets ?? []).map((b: string) => `<div style="font-size:13px;color:#333;margin-top:4px;">✓ ${b}</div>`).join("")}
      </div>`).join("");

    const modelHtml = (models ?? []).map((m: any) => `
      <div style="margin:0 0 12px;border:1px solid #e8e8e8;border-radius:12px;overflow:hidden;">
        ${m.model_image_url ? `<img src="${m.model_image_url}" alt="${m.model_name || ""}" style="width:100%;height:140px;object-fit:cover;display:block;">` : ""}
        <div style="padding:12px 16px;">
          <div style="font-size:15px;font-weight:700;color:#111;">${m.model_name || "Model"}</div>
          <div style="font-size:13px;color:#666;margin-top:2px;">
            ${m.bedrooms ? `${m.bedrooms} bd` : ""}${m.bedrooms && m.bathrooms ? " · " : ""}${m.bathrooms ? `${m.bathrooms} ba` : ""}${m.sqft ? ` · ${m.sqft} sqft` : ""}
          </div>
          ${m.starting_price ? `<div style="font-size:14px;font-weight:700;color:#0066cc;margin-top:4px;">From $${Number(m.starting_price).toLocaleString()}</div>` : ""}
        </div>
      </div>`).join("");

    const html = brandedEmail({
      kicker: p.vip_release === "Yes" ? "VIP PRE-CON RELEASE" : "FEATURED PRE-CON PROJECT",
      title: p.project_name,
      greeting: "Hi there,",
      bodyHtml: `
        ${p.main_image_url ? `<img src="${p.main_image_url}" alt="${p.project_name}" style="width:100%;height:auto;display:block;border-radius:12px;margin:0 0 20px;">` : ""}
        ${builderName ? `<p style="font-size:13px;color:#666;margin:0 0 4px;">by <strong>${builderName}</strong>${p.builder?.logo_url ? ` <img src="${p.builder.logo_url}" alt="" style="height:20px;vertical-align:middle;margin-left:6px;">` : ""}</p>` : ""}
        <p style="font-size:24px;font-weight:800;color:#111;margin:0 0 8px;">${price}</p>
        <p style="font-size:14px;color:#555;margin:0 0 16px;">${p.city || ""}${p.project_status ? ` · ${p.project_status}` : ""}</p>
        ${(p.beds || p.baths || p.sqft) ? `
        <div style="display:flex;gap:24px;margin:0 0 20px;padding:16px;background:#f8f9fa;border-radius:10px;">
          ${p.beds ? `<div><div style="font-size:18px;font-weight:700;color:#111;">${p.beds}</div><div style="font-size:12px;color:#888;">Bedrooms</div></div>` : ""}
          ${p.baths ? `<div><div style="font-size:18px;font-weight:700;color:#111;">${p.baths}</div><div style="font-size:12px;color:#888;">Bathrooms</div></div>` : ""}
          ${p.sqft ? `<div><div style="font-size:18px;font-weight:700;color:#111;">${p.sqft}</div><div style="font-size:12px;color:#888;">Sq Ft</div></div>` : ""}
        </div>` : ""}
        ${promoHtml ? `<div style="margin:0 0 20px;"><div style="font-size:14px;font-weight:700;color:#111;margin-bottom:10px;">Current Incentives</div>${promoHtml}</div>` : ""}
        ${p.project_description ? `<p style="font-size:14px;color:#333;line-height:1.7;margin:0 0 20px;">${p.project_description.slice(0, 350)}${p.project_description.length > 350 ? "..." : ""}</p>` : ""}
        ${modelHtml ? `<div style="margin:0 0 20px;"><div style="font-size:14px;font-weight:700;color:#111;margin-bottom:10px;">Featured Models</div>${modelHtml}</div>` : ""}
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
