/**
 * POST /api/track — first-party visitor tracking endpoint.
 *
 * The browser's VisitorTracker posts one event per page view here; this
 * route stamps the visitor's approximate location (city / region /
 * country, from Cloudflare's connection data — no IP address is stored)
 * and inserts the row into the CMS database's visitor_events table.
 * Tracking must never break the site: every outcome returns 204.
 */
import { createClient } from "@supabase/supabase-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

function str(v: unknown, max: number): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}

export async function POST(req: Request) {
  try {
    const body = JSON.parse(await req.text().catch(() => "")) as Record<string, unknown>;
    const sessionId = str(body.session_id, 64);
    const path = str(body.path, 300);
    if (!sessionId || !path) return new Response(null, { status: 204 });

    let geo: { city?: string; region?: string; country?: string } = {};
    try {
      const cf = (getCloudflareContext() as unknown as { cf?: Record<string, unknown> }).cf;
      if (cf) {
        geo = {
          city: typeof cf.city === "string" ? cf.city : undefined,
          region: typeof cf.region === "string" ? cf.region : undefined,
          country: typeof cf.country === "string" ? cf.country : undefined,
        };
      }
    } catch {
      // No Cloudflare context (local dev) — location stays empty.
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
    await supabase.from("visitor_events").insert({
      session_id: sessionId,
      path,
      referrer: str(body.referrer, 500),
      utm_source: str(body.utm_source, 120),
      utm_medium: str(body.utm_medium, 120),
      utm_campaign: str(body.utm_campaign, 120),
      device: str(body.device, 20),
      user_agent: str(body.user_agent, 300),
      city: geo.city ?? null,
      region: geo.region ?? null,
      country: geo.country ?? null,
    });
  } catch {
    // Swallow — a tracking failure must never surface to the visitor.
  }
  return new Response(null, { status: 204 });
}
