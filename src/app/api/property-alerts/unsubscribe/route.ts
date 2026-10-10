import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * One-click unsubscribe from property alerts.
 * GET /api/property-alerts/unsubscribe?token=...
 *
 * Uses the unsubscribe_token (no login required). Deactivates all
 * saved searches for that token, or a specific search if id= is given.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const searchId = req.nextUrl.searchParams.get("id");

  if (!token) {
    return new NextResponse("Missing token", { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find searches by token.
  let q = supabase.from("saved_searches").select("id, email, criteria_summary").eq("unsubscribe_token", token);
  if (searchId) q = q.eq("id", searchId);

  const { data: searches, error: fErr } = await q;
  if (fErr || !searches?.length) {
    return new NextResponse(unsubHtml("Invalid or expired link."), {
      status: 404,
      headers: { "Content-Type": "text/html" },
    });
  }

  // Deactivate.
  const ids = searches.map((s) => s.id);
  await supabase.from("saved_searches").update({ is_active: false }).in("id", ids);

  const summary = searches.length === 1
    ? `“${searches[0].criteria_summary || "your property alert"}”`
    : `${searches.length} property alerts`;

  return new NextResponse(unsubHtml(`You've been unsubscribed from ${summary}. You won't receive any more emails for ${searches.length === 1 ? "this search" : "these searches"}.`), {
    headers: { "Content-Type": "text/html" },
  });
}

function unsubHtml(message: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unsubscribed</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:480px;margin:60px auto;background:#fff;border-radius:12px;padding:40px 32px;text-align:center;">
<div style="font-size:20px;font-weight:700;margin-bottom:16px;">GETSETSOLD<span style="color:#0066cc;">.ca</span></div>
<div style="font-size:48px;margin-bottom:16px;">✓</div>
<p style="font-size:15px;color:#333;line-height:1.6;">${message}</p>
<p style="margin-top:24px;"><a href="/property-alerts" style="color:#0066cc;font-size:14px;">Create a new alert</a></p>
</div></body></html>`;
}
