import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Save a property alert (saved search).
 * POST /api/property-alerts
 * Body: { email, criteria: {beds, baths, minPrice, maxPrice, city, homeType, type}, criteriaSummary }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, criteria, criteriaSummary } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }
    if (!criteria || typeof criteria !== "object") {
      return NextResponse.json({ error: "Search criteria required" }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json({ error: "Server misconfigured (missing Supabase credentials)" }, { status: 500 });
    }

    const supabase = createClient(url, key);

  // Check for duplicate (same email + same criteria).
  const { data: existing } = await supabase
    .from("saved_searches")
    .select("id, is_active")
    .eq("email", email.toLowerCase().trim())
    .eq("criteria", criteria)
    .maybeSingle();

  if (existing) {
    // Reactivate if it was paused.
    if (!existing.is_active) {
      await supabase.from("saved_searches").update({ is_active: true }).eq("id", existing.id);
    }
    return NextResponse.json({ ok: true, id: existing.id, alreadyExists: true });
  }

  // Find or create CRM lead.
  let leadId: string | null = null;
  const { data: existingLead } = await supabase
    .from("leads")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (existingLead) {
    leadId = existingLead.id;
  } else {
    // Auto-create lead: service=buyer/renter based on search type.
    const service = criteria.type === "rent" ? "renter" : "buyer";
    const { data: newLead, error: leadErr } = await supabase
      .from("leads")
      .insert({
        email: email.toLowerCase().trim(),
        service,
        source_path: "/property-alerts",
        custom_fields: { source: "property-alert", criteria_summary: criteriaSummary },
        status: "new",
      })
      .select("id")
      .single();
    if (!leadErr && newLead) leadId = newLead.id;
  }

  const { data, error } = await supabase
    .from("saved_searches")
    .insert({
      email: email.toLowerCase().trim(),
      criteria,
      criteria_summary: criteriaSummary || null,
      lead_id: leadId,
    })
    .select("id, unsubscribe_token")
    .single();

  if (error) {
    return NextResponse.json({ error: "Couldn't save your alert" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
  } catch (e) {
    console.error("property-alerts POST error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
