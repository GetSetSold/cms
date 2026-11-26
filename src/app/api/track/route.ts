/**
 * POST /api/track — first-party visitor tracking endpoint.
 *
 * The browser's VisitorTracker posts here; this route stamps the
 * visitor's approximate location (city / region / country, from
 * Cloudflare's connection data — no IP address is stored) and writes:
 *  - type "view"  → a row in visitor_events (history) + presence upsert
 *  - type "ping"  → presence heartbeat (every ~20s while the tab is open)
 *  - type "leave" → presence row deleted (tab closed)
 * Presence is what powers the truly-live "On the site now" view in
 * Admin → Visitors. Tracking must never break the site: every outcome
 * returns 204.
 */
import { createClient } from "@supabase/supabase-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isBotUA } from "@/lib/botDetect";

export const dynamic = "force-dynamic";

function str(v: unknown, max: number): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}

function geoOf(): { city: string | null; region: string | null; country: string | null } {
  try {
    const cf = (getCloudflareContext() as unknown as { cf?: Record<string, unknown> }).cf;
    return {
      city: typeof cf?.city === "string" ? cf.city : null,
      region: typeof cf?.region === "string" ? cf.region : null,
      country: typeof cf?.country === "string" ? cf.country : null,
    };
  } catch {
    return { city: null, region: null, country: null };
  }
}

export async function POST(req: Request) {
  // Self-identified bots and crawlers aren't recorded at all — they
  // were drowning the real visitors (and the storage) in noise.
  if (isBotUA(req.headers.get("user-agent"))) return new Response(null, { status: 204 });
  try {
    const body = JSON.parse(await req.text().catch(() => "")) as Record<string, unknown>;
    const sessionId = str(body.session_id, 64);
    if (!sessionId) return new Response(null, { status: 204 });
    const type = body.type === "ping" || body.type === "leave" ? body.type : "view";
    const path = str(body.path, 300);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );

    if (type === "leave") {
      await supabase.from("visitor_presence").delete().eq("session_id", sessionId);
      return new Response(null, { status: 204 });
    }
    if (!path) return new Response(null, { status: 204 });

    const geo = geoOf();
    const nowIso = new Date().toISOString();

    // Presence writes use update-then-insert, NOT upsert: Postgres'
    // ON CONFLICT path demands read access for the anonymous role,
    // which we deliberately don't grant (the live list stays private).
    // Plain insert/update/delete are covered by the write policies.
    const touchPresence = async (row: Record<string, unknown>, patch: Record<string, unknown>) => {
      const { data } = await supabase
        .from("visitor_presence")
        .update(patch)
        .eq("session_id", sessionId)
        .select("session_id");
      if (!data || data.length === 0) {
        // No live row yet — create it. A duplicate-key error here just
        // means a racing request created it first; safe to ignore.
        await supabase.from("visitor_presence").insert(row);
      }
    };

    if (type === "view") {
      await supabase.from("visitor_events").insert({
        session_id: sessionId,
        path,
        referrer: str(body.referrer, 500),
        utm_source: str(body.utm_source, 120),
        utm_medium: str(body.utm_medium, 120),
        utm_campaign: str(body.utm_campaign, 120),
        device: str(body.device, 20),
        user_agent: str(body.user_agent, 300),
        ...geo,
      });
      // Landing-only fields (referrer / UTM) are added only when present,
      // so a later page view in the same session can't blank them out.
      const presence: Record<string, unknown> = {
        session_id: sessionId,
        path,
        device: str(body.device, 20),
        ...geo,
        last_seen: nowIso,
      };
      const referrer = str(body.referrer, 500);
      if (referrer) presence.referrer = referrer;
      const utmSource = str(body.utm_source, 120);
      if (utmSource) presence.utm_source = utmSource;
      const utmCampaign = str(body.utm_campaign, 120);
      if (utmCampaign) presence.utm_campaign = utmCampaign;
      await touchPresence(presence, presence);
    } else {
      // ping — refresh the live row only (first_seen and the landing
      // source stay from the original view).
      const patch = { path, ...geo, last_seen: nowIso };
      await touchPresence({ session_id: sessionId, ...patch }, patch);
    }
  } catch {
    // Swallow — a tracking failure must never surface to the visitor.
  }
  return new Response(null, { status: 204 });
}
