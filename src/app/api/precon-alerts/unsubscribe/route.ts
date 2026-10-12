import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * One-click pre-con unsubscribe. Token is the subscription id in leads.payload.
 * GET /api/precon-alerts/unsubscribe?token=...
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  const supabase = createClient(url, key);

  // Find lead with this subscription id in payload.
  const { data: leads } = await supabase
    .from("leads")
    .select("id, payload")
    .not("payload->precon_subscriptions", "is", null)
    .limit(200);

  for (const l of (leads ?? []) as any[]) {
    const subs: any[] = Array.isArray(l.payload?.precon_subscriptions) ? l.payload.precon_subscriptions : [];
    if (subs.some((s: any) => s.id === token)) {
      const updated = subs.map((s: any) => s.id === token ? { ...s, is_active: false } : s);
      await supabase.from("leads")
        .update({ payload: { ...(l.payload ?? {}), precon_subscriptions: updated } })
        .eq("id", l.id);
      break;
    }
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://cms.rohit-910.workers.dev";
  return NextResponse.redirect(`${site}/pre-con-alerts/unsubscribed`);
}
