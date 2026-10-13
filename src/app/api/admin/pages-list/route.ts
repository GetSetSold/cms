import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireStaff } from "@/lib/auth";

/** GET /api/admin/pages-list — flat list of linkable pages for the link picker. */
export async function GET() {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }

  const cms = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const pages: { title: string; url: string; group: string }[] = [];

  // CMS pages
  const { data: cmsPages } = await cms.from("pages").select("slug, title").eq("status", "published").order("title");
  for (const p of (cmsPages ?? []) as any[]) {
    pages.push({ title: p.title || p.slug, url: p.slug === "home" ? "/" : `/${p.slug}`, group: "Pages" });
  }

  // Blog posts
  try {
    const { data: posts } = await cms.from("posts").select("slug, title").eq("status", "published").order("title").limit(100);
    for (const p of (posts ?? []) as any[]) {
      pages.push({ title: p.title || p.slug, url: `/blog/${p.slug}`, group: "Blog" });
    }
  } catch {}

  // Key site routes
  const routes: [string, string][] = [
    ["All Listings", "/listings"],
    ["Property Alerts Signup", "/property-alerts"],
    ["Manage Property Alerts", "/property-alerts/manage"],
    ["Pre-Construction Projects", "/pre-construction"],
    ["Pre-Con Alerts Signup", "/pre-con-alerts"],
    ["Free Home Valuation", "/free-online-home-valuation"],
    ["Affordability Calculator", "/affordability-calculator"],
    ["Mortgage Calculator", "/mortgage-calculator"],
    ["Land Transfer Tax Calculator", "/land-transfer-tax-calculator"],
    ["CMHC Insurance Calculator", "/cmhc-insurance-calculator"],
    ["Ontario Housing Market Trends", "/ontario-housing-market-trends"],
    ["Contact", "/contact"],
  ];
  for (const [title, url] of routes) {
    pages.push({ title, url, group: "Site" });
  }

  // Sort by group then title
  pages.sort((a, b) => a.group.localeCompare(b.group) || a.title.localeCompare(b.title));

  return NextResponse.json({ pages });
}
