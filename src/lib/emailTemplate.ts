/**
 * Standard GetSetSold email template.
 * Used for property alerts, confirmations, and all CMS emails.
 */
export function brandedEmail(opts: {
  kicker: string;
  title: string;
  greeting: string;
  bodyHtml: string;
  cta?: { label: string; href: string };
  footerNote: string;
}): string {
  const { kicker, title, greeting, bodyHtml, cta, footerNote } = opts;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;">
<!-- Header -->
<div style="background:#0a0a1a;color:#ffffff;padding:28px 32px;">
<div style="font-size:22px;font-weight:700;">GetSetSold<span style="color:#0066cc;">.ca</span></div>
<div style="font-size:13px;color:#aaa;margin-top:6px;">Rohit Sharma, REALTOR&reg;</div>
<div style="font-size:11px;color:#777;letter-spacing:1px;">LOMBARD GROUP REAL ESTATE INC., BROKERAGE</div>
</div>
<!-- Content -->
<div style="padding:32px;">
<div style="font-size:12px;font-weight:700;letter-spacing:1.5px;color:#0066cc;margin-bottom:8px;">${kicker}</div>
<h1 style="font-size:24px;font-weight:700;color:#111;margin:0 0 16px;">${title}</h1>
<p style="font-size:15px;color:#555;margin:0 0 20px;">${greeting}</p>
<div style="font-size:15px;color:#333;line-height:1.7;">${bodyHtml}</div>
${cta ? `<a href="${cta.href}" style="display:inline-block;margin-top:24px;background:#0066cc;color:#fff;text-decoration:none;padding:14px 32px;font-size:15px;font-weight:600;">${cta.label}</a>` : ""}
<div style="margin-top:32px;padding-top:24px;border-top:1px solid #e5e5e5;">
<p style="font-size:15px;font-weight:700;color:#111;margin:0;">Rohit Sharma, REALTOR&reg;</p>
<p style="font-size:14px;color:#666;margin:4px 0 0;">Lombard Group Real Estate Inc., Brokerage</p>
</div>
</div>
<!-- Footer -->
<div style="background:#f5f5f5;padding:20px 32px;text-align:center;border-top:1px solid #e5e5e5;">
<p style="font-size:12px;color:#999;margin:0;">${footerNote}</p>
</div>
</div></body></html>`;
}
