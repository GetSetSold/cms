import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireStaff } from "@/lib/auth";
import { createPreconServiceClient } from "@/lib/precon";
import { buildPreconBroadcastEmail } from "@/lib/preconEmail";

const SEND_DELAY_MS = 1500; // stagger between sends to avoid provider throttling
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Admin: broadcast a single project to all active pre-con subscribers.
 * POST /api/admin/precon-broadcast { project_slug, test_email? }
 * If test_email is given, only that address gets the email (no logging).
 */
export async function POST(req: NextRequest) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }

  const { project_slug, test_email } = await req.json();
  if (!project_slug) return NextResponse.json({ error: "project_slug required" }, { status: 400 });

  const cms = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const precon = createPreconServiceClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cms.rohit-910.workers.dev";

  // Load project + promos + models.
  const { data: projects } = await precon
    .from("projects")
    .select("*, builder:builder_id(builder_name, logo_url)")
    .eq("slug", project_slug)
    .limit(1);
  const project: any = projects?.[0];
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const { data: promos } = await precon
    .from("promos").select("title, description, badge, bullets")
    .eq("project_id", project.id).eq("show", true).limit(3);
  const { data: models } = await precon
    .from("home_models").select("model_name, bedrooms, bathrooms, sqft, starting_price, model_image_url, slug")
    .eq("project_id", project.id).limit(2);

  // Resolve recipients.
  let recipients: { email: string; first_name: string | null; lead_id: string | null; unsubscribe_token: string; id?: string }[] = [];
  if (test_email) {
    // Test mode: find or create lead for the test address so send-email works.
    const normalized = test_email.toLowerCase().trim();
    let leadId: string | null = null;
    const { data: lead } = await cms.from("leads").select("id, first_name").eq("email", normalized).maybeSingle();
    if (lead) {
      leadId = lead.id;
      recipients = [{ email: normalized, first_name: (lead as any).first_name ?? null, lead_id: leadId, unsubscribe_token: "test" }];
    } else {
      const { data: newLead } = await cms.from("leads").insert({
        email: normalized, service: "buyer", source_path: "/admin/precon-broadcast",
        custom_fields: { source: "precon-broadcast-test" }, status: "new",
      }).select("id").single();
      recipients = [{ email: normalized, first_name: null, lead_id: newLead?.id ?? null, unsubscribe_token: "test" }];
    }
  } else {
    const { data: subs, error } = await cms
      .from("precon_subscribers")
      .select("id, email, first_name, lead_id, unsubscribe_token")
      .eq("is_active", true);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    recipients = subs ?? [];
  }

  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, failed: 0, message: "No recipients" });
  }

  // Create broadcast log (skip for test).
  let broadcastId: string | null = null;
  if (!test_email) {
    const { data: b } = await cms.from("precon_broadcasts").insert({
      project_id: String(project.id), project_name: project.project_name, project_slug: project.slug,
    }).select("id").single();
    broadcastId = b?.id ?? null;
  }

  const subject = `${project.project_name} — new pre-con ${project.vip_release === "Yes" ? "VIP release" : "project"}`;
  let sent = 0, failed = 0;
  const failures: { email: string; error: string }[] = [];

  for (const r of recipients) {
    if (!r.lead_id) {
      failed++;
      failures.push({ email: r.email, error: "No linked lead" });
      continue;
    }
    const html = buildPreconBroadcastEmail({
      project, promos: (promos ?? []) as any, models: (models ?? []) as any,
      siteUrl,
      greeting: `Hi ${r.first_name || "there"},`,
      unsubscribeToken: r.unsubscribe_token,
    });
    try {
      const { error } = await cms.functions.invoke("send-email", {
        body: {
          lead_id: r.lead_id,
          subject,
          body: html,
          from_email: "noreply@getsetsold.ca",
          reply_to: "rohit@getsetsold.ca",
        },
      });
      if (error) throw new Error(error.message || "send-email failed");
      sent++;
      if (broadcastId) {
        await cms.from("precon_broadcast_sends").insert({
          broadcast_id: broadcastId, subscriber_id: r.id ?? null, email: r.email, status: "sent",
        });
      }
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : "send failed";
      failures.push({ email: r.email, error: msg });
      if (broadcastId) {
        await cms.from("precon_broadcast_sends").insert({
          broadcast_id: broadcastId, subscriber_id: r.id ?? null, email: r.email, status: "failed", error: msg,
        });
      }
    }
    if (!test_email) await sleep(SEND_DELAY_MS);
  }

  if (broadcastId) {
    await cms.from("precon_broadcasts").update({ sent_count: sent, failed_count: failed }).eq("id", broadcastId);
  }

  return NextResponse.json({ ok: true, sent, failed, failures: failures.slice(0, 10), broadcastId });
}

/** GET /api/admin/precon-broadcast — recent broadcast history. */
export async function GET() {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }

  const cms = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await cms.from("precon_broadcasts").select("*").order("created_at", { ascending: false }).limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ broadcasts: data ?? [] });
}
