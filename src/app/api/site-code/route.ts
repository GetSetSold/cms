import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET /api/site-code — sitewide custom code (chat widgets, pixels) from settings. */
export const revalidate = 300;

export async function GET() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("site_settings").select("custom_code").eq("id", 1).single();
    const code = typeof data?.custom_code === "string" ? data.custom_code : "";
    return NextResponse.json(
      { code },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" } },
    );
  } catch {
    return NextResponse.json({ code: "" });
  }
}
