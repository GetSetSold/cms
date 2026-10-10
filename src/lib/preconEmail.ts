import { brandedEmail } from "@/lib/emailTemplate";

export type PreconBroadcastProject = {
  id: string;
  project_name: string;
  slug: string;
  city: string | null;
  project_status: string | null;
  p_start_price: number | string | null;
  main_image_url: string | null;
  beds: string | null;
  baths: string | null;
  sqft: string | null;
  vip_release: string | null;
  project_message: string | null;
  project_description: string | null;
  builder?: { builder_name: string; logo_url: string | null } | null;
};

export type PreconPromo = {
  title: string | null;
  description: string | null;
  badge: string | null;
  bullets: string[] | null;
};

export type PreconModel = {
  model_name: string | null;
  bedrooms: string | null;
  bathrooms: string | null;
  sqft: string | null;
  starting_price: string | null;
  model_image_url: string | null;
  slug: string | null;
};

/**
 * Build the single-project pre-con broadcast email HTML.
 * Shared by the preview endpoint and the admin broadcast sender.
 */
export function buildPreconBroadcastEmail(opts: {
  project: PreconBroadcastProject;
  promos: PreconPromo[];
  models: PreconModel[];
  siteUrl: string;
  greeting: string;
  unsubscribeToken: string;
}): string {
  const { project: p, promos, models, siteUrl, greeting, unsubscribeToken } = opts;

  const builderName = p.builder?.builder_name || "";
  const price = p.p_start_price ? `From $${Number(p.p_start_price).toLocaleString()}` : "Price on request";

  const promoHtml = promos.map((promo) => `
    <div style="background:#fff8e1;border:1px solid #ffe082;border-radius:10px;padding:14px 16px;margin:0 0 12px;">
      ${promo.badge ? `<span style="display:inline-block;background:#f57f17;color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:12px;margin-bottom:6px;">${promo.badge}</span>` : ""}
      <div style="font-size:15px;font-weight:700;color:#111;">${promo.title || ""}</div>
      ${promo.description ? `<div style="font-size:13px;color:#555;margin-top:4px;">${promo.description}</div>` : ""}
      ${(promo.bullets ?? []).map((b: string) => `<div style="font-size:13px;color:#333;margin-top:4px;">✓ ${b}</div>`).join("")}
    </div>`).join("");

  const modelHtml = models.map((m) => `
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

  return brandedEmail({
    kicker: p.vip_release === "Yes" ? "VIP PRE-CON RELEASE" : "FEATURED PRE-CON PROJECT",
    title: p.project_name,
    greeting,
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
        <a href="${siteUrl}/pre-con" style="color:#0066cc;text-decoration:none;">Browse all pre-con projects</a><br><br>
        <a href="${siteUrl}/api/precon-alerts/unsubscribe?token=${unsubscribeToken}" style="color:#999;text-decoration:underline;font-size:12px;">Unsubscribe from pre-con updates</a>
      </p>`,
    footerNote: "You're receiving this because you subscribed to pre-con updates on GetSetSold.ca.",
  });
}
