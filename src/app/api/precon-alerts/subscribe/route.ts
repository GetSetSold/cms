import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Public pre-con alert signup.
 * POST /api/precon-alerts/subscribe { email, firstName? }
 */
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

    // Find or create CRM lead (buyer, source precon).
    let leadId: string | null = null;
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("email", normalized)
      .maybeSingle();
    if (existingLead) {
      leadId = existingLead.id;
    } else {
      const { data: newLead } = await supabase
        .from("leads")
        .insert({
          email: normalized,
          service: "buyer",
          source_path: "/pre-con-alerts",
          custom_fields: { source: "precon-alert" },
          status: "new",
        })
        .select("id")
        .single();
      if (newLead) leadId = newLead.id;
    }

    // Upsert subscriber.
    const { data: existing } = await supabase
      .from("precon_subscribers")
      .select("id, is_active")
      .eq("email", normalized)
      .maybeSingle();

    if (existing) {
      if (!existing.is_active) {
        await supabase.from("precon_subscribers").update({ is_active: true }).eq("id", existing.id);
      }
      return NextResponse.json({ ok: true, alreadyExists: true });
    }

    const { error } = await supabase.from("precon_subscribers").insert({
      email: normalized,
      first_name: firstName?.trim() || null,
      lead_id: leadId,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
