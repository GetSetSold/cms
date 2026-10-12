import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Public pre-con alert signup.
 * Uses precon_subscribers table in CMS DB.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, firstName, filters } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    const supabase = createClient(url, key);
    const normalized = email.toLowerCase().trim();

    const cleanFilters = {
      all_projects: filters?.all_projects !== false,
      cities: Array.isArray(filters?.cities) ? filters.cities.filter(Boolean).slice(0, 10) : [],
      min_price: typeof filters?.min_price === "number" && filters.min_price > 0 ? Math.round(filters.min_price) : null,
      max_price: typeof filters?.max_price === "number" && filters.max_price > 0 ? Math.round(filters.max_price) : null,
    };
    if (cleanFilters.cities.length || cleanFilters.min_price || cleanFilters.max_price) {
      cleanFilters.all_projects = false;
    }

    // Find or create lead.
    let leadId: string | null = null;
    const { data: existingLead } = await supabase.from("leads").select("id").eq("email", normalized).maybeSingle();
    if ((existingLead as any)?.id) {
      leadId = (existingLead as any).id;
    } else {
      const { data: newLead } = await supabase.from("leads").insert({
        email: normalized,
        first_name: firstName?.trim() || null,
        service: "buyer",
        source_path: "/pre-con-alerts",
        custom_fields: { source: "precon-alert" },
        status: "new",
      }).select("id").single();
      if ((newLead as any)?.id) leadId = (newLead as any).id;
    }

    // Upsert subscriber.
    const { data: existing } = await supabase.from("precon_subscribers").select("id, is_active").eq("email", normalized).maybeSingle();
    if ((existing as any)?.id) {
      await supabase.from("precon_subscribers").update({
        is_active: true,
        filters: cleanFilters,
        first_name: firstName?.trim() || null,
        lead_id: leadId,
      }).eq("id", (existing as any).id);
      return NextResponse.json({ ok: true, alreadyExists: true });
    }

    const { error } = await supabase.from("precon_subscribers").insert({
      email: normalized,
      first_name: firstName?.trim() || null,
      lead_id: leadId,
      filters: cleanFilters,
      is_active: true,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, alreadyExists: false });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
