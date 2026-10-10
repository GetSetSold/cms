import { NextRequest, NextResponse } from "next/server";
import { createPreconClient } from "@/lib/precon";
import { buildPreconBroadcastEmail } from "@/lib/preconEmail";

/**
 * Preview a single-project pre-con broadcast email.
 * GET /api/precon-alerts/preview-single?slug=<project-slug>
 */
export async function GET(req: NextRequest) {
  const siteUrl = "https://cms.rohit-910.workers.dev";
  const slug = req.nextUrl.searchParams.get("slug");

  try {
    const precon = createPreconClient();
    let query = precon.from("projects").select("*, builder:builder_id(builder_name, logo_url)");
    if (slug) query = query.eq("slug", slug);
    const { data: projects } = await query.order("created_at", { ascending: false }).limit(1);

    const p: any = projects?.[0];
    if (!p) return NextResponse.json({ error: "No project found" }, { status: 404 });

    const { data: promos } = await precon
      .from("promos")
      .select("title, description, badge, bullets")
      .eq("project_id", p.id)
      .eq("show", true)
      .limit(3);

    const { data: models } = await precon
      .from("home_models")
      .select("model_name, bedrooms, bathrooms, sqft, starting_price, model_image_url, slug")
      .eq("project_id", p.id)
      .limit(2);

    const html = buildPreconBroadcastEmail({
      project: p,
      promos: (promos ?? []) as any,
      models: (models ?? []) as any,
      siteUrl,
      greeting: "Hi there,",
      unsubscribeToken: "preview",
    });

    return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
