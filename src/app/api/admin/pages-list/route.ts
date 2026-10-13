import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireStaff } from "@/lib/auth";

/** GET /api/admin/pages-list — flat list of published pages for link picker. */
export async function GET() {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }

  const cms = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await cms.from("pages").select("slug, title").eq("status", "published").order("title");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    pages: ((data ?? []) as any[]).map((p) => ({
      slug: p.slug,
      title: p.title || p.slug,
      url: p.slug === "home" ? "/" : `/${p.slug}`,
    })),
  });
}
