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
  builder?: { builder_name: string; logo_url: string | null; slug?: string | null } | null;
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
  cashbackAmount?: number | null;
}): string {
  const { project: p, promos, models, siteUrl, greeting, unsubscribeToken, cashbackAmount } = opts;

  const builderName = p.builder?.builder_name || "";
  const price = p.p_start_price ? `From $${Number(p.p_start_price).toLocaleString()}` : "Price on request";
  const projectUrl = p.builder?.slug ? `${siteUrl}/pre-construction/${p.builder.slug}/${p.slug}` : `${siteUrl}/pre-construction/${p.slug}`;

  const promoHtml = (() => {
    // Split promos: ones with bullets/description (full width) vs badge-only (2-col)
    const fullWidth: string[] = [];
    const cards: string[] = [];
    for (const promo of promos) {
      const hasBullets = (promo.bullets ?? []).length > 0;
      const hasDesc = !!promo.description;
      if (hasBullets || hasDesc) {
        const bullets = (promo.bullets ?? []).map((b: string, i: number, arr: string[]) => `
          <div style="font-size:13px;color:#333;padding:8px 0;${i < arr.length - 1 ? "border-bottom:1px solid #f0f0f0;" : ""}">✓ ${b}</div>`).join("");
        fullWidth.push(`
          <div style="background:#ffffff;border:1px solid #dbe7f5;border-radius:10px;padding:14px 16px;margin:0 0 12px;">
            ${promo.badge ? `<span style="display:inline-block;background:#0066cc;color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:12px;margin-bottom:6px;">${promo.badge}</span>` : ""}
            <div style="font-size:15px;font-weight:700;color:#111;">${promo.title || ""}</div>
            ${promo.description ? `<div style="font-size:13px;color:#555;margin-top:6px;line-height:1.6;">${promo.description}</div>` : ""}
            ${bullets ? `<div style="margin-top:8px;">${bullets}</div>` : ""}
          </div>`);
      } else {
        cards.push(`
          <td width="50%" valign="top" style="padding:0 6px 12px;">
            <div style="background:#ffffff;border:1px solid #dbe7f5;border-radius:10px;padding:14px 16px;height:100%;">
              ${promo.badge ? `<span style="display:inline-block;background:#0066cc;color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:12px;margin-bottom:6px;">${promo.badge}</span>` : ""}
              <div style="font-size:15px;font-weight:700;color:#111;">${promo.title || ""}</div>
            </div>
          </td>`);
      }
    }
    let html = fullWidth.join("");
    if (cards.length) {
      // Pair cards into rows of 2
      const rows: string[] = [];
      for (let i = 0; i < cards.length; i += 2) {
        const pair = cards.slice(i, i + 2);
        // If odd number, add empty cell
        if (pair.length === 1) pair.push(`<td width="50%" style="padding:0 6px 12px;"></td>`);
        rows.push(`<tr>${pair.join("")}</tr>`);
      }
      html += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 -6px;"><tbody>${rows.join("")}</tbody></table>`;
    }
    return html;
  })();

  const cashbackHtml = cashbackAmount ? `
    <div style="background:#0a0a1a;border-radius:10px;padding:16px 20px;margin:0 0 20px;text-align:center;">
      <div style="font-size:12px;font-weight:700;letter-spacing:1.5px;color:#fff;margin-bottom:6px;">BUYER CASHBACK OFFER</div>
      <div style="font-size:28px;font-weight:800;color:#fff;">$${cashbackAmount.toLocaleString()} <span style="font-size:16px;font-weight:600;">cashback</span></div>
      <div style="font-size:13px;color:#aaa;margin-top:6px;">When you buy with us</div>
    </div>` : "";

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
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#f8f9fa;border-radius:10px;">
        <tr>
          ${p.beds ? `<td width="33%" align="center" valign="top" style="padding:16px 8px;"><div style="font-size:18px;font-weight:700;color:#111;">${p.beds}</div><div style="font-size:12px;color:#888;margin-top:2px;">Bedrooms</div></td>` : ""}
          ${p.baths ? `<td width="33%" align="center" valign="top" style="padding:16px 8px;"><div style="font-size:18px;font-weight:700;color:#111;">${p.baths}</div><div style="font-size:12px;color:#888;margin-top:2px;">Bathrooms</div></td>` : ""}
          ${p.sqft ? `<td width="33%" align="center" valign="top" style="padding:16px 8px;"><div style="font-size:18px;font-weight:700;color:#111;">${p.sqft}</div><div style="font-size:12px;color:#888;margin-top:2px;">Sq Ft</div></td>` : ""}
        </tr>
      </table>` : ""}
      ${promoHtml ? `<div style="margin:0 0 20px;"><div style="font-size:14px;font-weight:700;color:#111;margin-bottom:10px;">Current Incentives</div>${promoHtml}</div>` : ""}
      ${cashbackHtml}
      ${models.length ? `
      <div style="margin:0 0 20px;">
        <div style="font-size:14px;font-weight:700;color:#111;margin-bottom:10px;">Featured Models</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            ${(models.slice(0, 2)).map((m, i) => `
            <td width="50%" valign="top" style="padding-${i === 0 ? "right" : "left"}:8px;">
              <div style="margin:0 0 12px;border:1px solid #e8e8e8;border-radius:12px;overflow:hidden;">
                ${m.model_image_url ? `<img src="${m.model_image_url}" alt="${m.model_name || ""}" style="width:100%;height:140px;object-fit:cover;display:block;">` : ""}
                <div style="padding:12px 16px;">
                  <div style="font-size:15px;font-weight:700;color:#111;">${m.model_name || "Model"}</div>
                  <div style="font-size:13px;color:#666;margin-top:2px;">
                    ${m.bedrooms ? `${m.bedrooms} bd` : ""}${m.bedrooms && m.bathrooms ? " · " : ""}${m.bathrooms ? `${m.bathrooms} ba` : ""}${m.sqft ? ` · ${m.sqft} sqft` : ""}
                  </div>
                  ${m.starting_price ? `<div style="font-size:14px;font-weight:700;color:#0066cc;margin-top:4px;">From $${Number(m.starting_price).toLocaleString()}</div>` : ""}
                </div>
              </div>
            </td>`).join("")}
          </tr>
        </table>
      </div>` : ""}
      ${p.project_description ? `<p style="font-size:14px;color:#333;line-height:1.7;margin:0 0 20px;">${p.project_description.slice(0, 350)}${p.project_description.length > 350 ? "..." : ""}</p>` : ""}
      ${p.project_message ? `<p style="font-size:14px;color:#0066cc;background:#f0f4fa;padding:12px 16px;border-radius:8px;margin:0 0 20px;">${p.project_message}</p>` : ""}
      <div style="text-align:center;margin:24px 0;">
        <a href="${projectUrl}#lead" style="display:inline-block;background:#0066cc;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:999px;font-size:15px;font-weight:600;margin:0 6px 10px;">I'm Interested — Register Now</a><br>
        <a href="${projectUrl}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:999px;font-size:15px;font-weight:600;margin:0 6px;">View Full Details & Floor Plans</a>
      </div>
      <p style="font-size:13px;color:#888;text-align:center;margin:20px 0 0;">
        Questions? Reply to this email or call me directly.<br>
        <a href="${siteUrl}/pre-construction" style="color:#0066cc;text-decoration:none;">Browse all pre-con projects</a><br><br>
        <a href="${siteUrl}/api/precon-alerts/unsubscribe?token=${unsubscribeToken}" style="color:#999;text-decoration:underline;font-size:12px;">Unsubscribe from pre-con updates</a>
      </p>`,
    footerNote: "You're receiving this because you subscribed to pre-con updates on GetSetSold.ca.",
  });
}
