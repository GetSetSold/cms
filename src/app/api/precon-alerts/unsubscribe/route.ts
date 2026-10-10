import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * One-click pre-con unsubscribe.
 * GET /api/precon-alerts/unsubscribe?token=...
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  const supabase = createClient(url, key);

  const { data } = await supabase
    .from("precon_subscribers")
    .select("id")
    .eq("unsubscribe_token", token)
    .maybeSingle();

  if (data) {
    await supabase.from("precon_subscribers").update({ is_active: false }).eq("id", data.id);
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://cms.rohit-910.workers.dev";
  return NextResponse.redirect(`${site}/pre-con-alerts/unsubscribed`);
}
