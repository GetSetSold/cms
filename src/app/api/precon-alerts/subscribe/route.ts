import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

/**
 * Public pre-con alert signup.
 * Stores subscription in leads.payload->precon_subscriptions.
 * No contacts table dependency.
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

    // Find existing lead by email in payload.
    const { data: leads } = await supabase
      .from("leads")
      .select("id, payload")
      .eq("payload->>email", normalized)
      .limit(1);

    let leadId: string | null = (leads as any[])?.[0]?.id ?? null;
    let payload: any = (leads as any[])?.[0]?.payload ?? {};

    if (!leadId) {
      const { data: newLead, error: leadError } = await supabase
        .from("leads")
        .insert({
          form_type: "precon_alert",
          payload: { email: normalized, first_name: firstName?.trim() || null, source: "precon-alert" },
          status: "new",
        })
        .select("id, payload")
        .single();
      if (leadError) return NextResponse.json({ error: "Lead: " + leadError.message }, { status: 500 });
      leadId = (newLead as any)?.id ?? null;
      payload = (newLead as any)?.payload ?? {};
    }

    if (!leadId) return NextResponse.json({ error: "Could not create lead" }, { status: 500 });

    const subs: any[] = Array.isArray(payload.precon_subscriptions) ? payload.precon_subscriptions : [];
    const alreadyExists = subs.some((s: any) => s.is_active);
    if (!alreadyExists) {
      subs.push({
        id: randomUUID(),
        filters: cleanFilters,
        is_active: true,
        created_at: new Date().toISOString(),
      });
      const { error } = await supabase.from("leads")
        .update({ payload: { ...payload, precon_subscriptions: subs } })
        .eq("id", leadId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, alreadyExists });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
