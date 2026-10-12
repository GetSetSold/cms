import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** Public BoC rate alert signup. POST /api/rate-alerts/subscribe { email, firstName? } */
export async function POST(req: NextRequest) {
  try {
    const { email, firstName } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    const supabase = createClient(url, key);
    const normalized = email.toLowerCase().trim();

    let leadId: string | null = null;
    const { data: existingLead } = await supabase.from("leads").select("id").eq("email", normalized).maybeSingle();
    if ((existingLead as any)?.id) {
      leadId = (existingLead as any).id;
    } else {
      const { data: newLead } = await supabase.from("leads").insert({
        email: normalized, first_name: firstName?.trim() || null,
        service: "buyer", source_path: "/rate-alerts",
        custom_fields: { source: "rate-alert" }, status: "new",
      }).select("id").single();
      if ((newLead as any)?.id) leadId = (newLead as any).id;
    }

    const { data: existing } = await supabase.from("rate_subscribers").select("id, is_active").eq("email", normalized).maybeSingle();
    if ((existing as any)?.id) {
      if (!(existing as any).is_active) {
        await supabase.from("rate_subscribers").update({ is_active: true }).eq("id", (existing as any).id);
      }
      return NextResponse.json({ ok: true, alreadyExists: true });
    }

    const { error } = await supabase.from("rate_subscribers").insert({
      email: normalized, first_name: firstName?.trim() || null, lead_id: leadId, is_active: true,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, alreadyExists: false });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
