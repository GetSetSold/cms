/**
 * Bank of Canada rate update email template.
 * Blue/black/white/mist palette, branded header.
 */

export type RateUpdateOpts = {
  oldRate: number;
  newRate: number;
  effectiveDate: string;
  headline: string;
  commentary: string; // HTML or plain text
  siteUrl: string;
  greeting?: string;
  unsubscribeToken?: string;
};

function fmtRate(r: number): string {
  return `${r.toFixed(2)}%`;
}

export function buildRateUpdateEmail(opts: RateUpdateOpts): string {
  const { oldRate, newRate, effectiveDate, headline, commentary, siteUrl, greeting, unsubscribeToken } = opts;
  const direction = newRate > oldRate ? "increased" : newRate < oldRate ? "decreased" : "held steady";
  const arrow = newRate > oldRate ? "↑" : newRate < oldRate ? "↓" : "→";
  const changeColor = newRate > oldRate ? "#cc0000" : newRate < oldRate ? "#0066cc" : "#666";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;">
<div style="background:#0a0a1a;color:#ffffff;padding:28px 32px;">
<div style="font-size:22px;font-weight:700;">GetSetSold<span style="color:#0066cc;">.ca</span></div>
<div style="font-size:13px;color:#aaa;margin-top:6px;">Rohit Sharma, REALTOR&reg;</div>
<div style="font-size:11px;color:#777;letter-spacing:1px;">LOMBARD GROUP REAL ESTATE INC., BROKERAGE</div>
</div>
<div style="padding:32px;">
<div style="font-size:12px;font-weight:700;letter-spacing:1.5px;color:#0066cc;margin-bottom:8px;">BANK OF CANADA UPDATE</div>
<h1 style="font-size:24px;font-weight:700;color:#111;margin:0 0 16px;">${headline}</h1>
${greeting ? `<p style="font-size:15px;color:#555;margin:0 0 20px;">${greeting}</p>` : ""}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#f8f9fa;border-radius:10px;">
<tr>
<td width="50%" align="center" style="padding:20px 16px;">
<div style="font-size:12px;color:#888;letter-spacing:1px;">PREVIOUS</div>
<div style="font-size:32px;font-weight:800;color:#666;margin-top:4px;">${fmtRate(oldRate)}</div>
</td>
<td width="50%" align="center" style="padding:20px 16px;border-left:1px solid #e8e8e8;">
<div style="font-size:12px;color:#888;letter-spacing:1px;">NEW RATE</div>
<div style="font-size:32px;font-weight:800;color:${changeColor};margin-top:4px;">${arrow} ${fmtRate(newRate)}</div>
</td>
</tr>
</table>

<p style="font-size:13px;color:#888;margin:0 0 20px;">Effective ${effectiveDate} · Bank of Canada ${direction} the overnight rate.</p>

<div style="font-size:15px;color:#333;line-height:1.7;margin:0 0 20px;">${commentary}</div>

<div style="text-align:center;margin:24px 0;">
<a href="${siteUrl}/free-online-home-valuation" style="display:inline-block;background:#0066cc;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:999px;font-size:15px;font-weight:600;">What's My Home Worth Now?</a>
</div>

<p style="font-size:13px;color:#888;text-align:center;margin:20px 0 0;">
Questions about what this means for you? Reply to this email.<br><br>
${unsubscribeToken ? `<a href="${siteUrl}/api/rate-alerts/unsubscribe?token=${unsubscribeToken}" style="color:#999;text-decoration:underline;font-size:12px;">Unsubscribe from rate updates</a>` : ""}
</p>
</div>

<div style="margin-top:32px;padding-top:24px;border-top:1px solid #e5e5e5;padding-left:32px;padding-right:32px;">
<p style="font-size:15px;font-weight:700;color:#111;margin:0;">Rohit Sharma, REALTOR&reg;</p>
<p style="font-size:14px;color:#666;margin:4px 0 0;">Lombard Group Real Estate Inc., Brokerage</p>
</div>
</div>
<div style="background:#f5f5f5;padding:20px 32px;text-align:center;border-top:1px solid #e5e5e5;max-width:600px;margin:0 auto;">
<p style="font-size:12px;color:#999;margin:0;">You're receiving this because you subscribed to Bank of Canada rate updates on GetSetSold.ca.</p>
</div>
</div></body></html>`;
}
