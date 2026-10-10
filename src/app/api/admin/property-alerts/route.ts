import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Admin: manually create a property alert for a client.
 * POST /api/admin/property-alerts { email, firstName, criteria, criteriaSummary }
 */
export async function POST(req: NextRequest) {
  const { email, firstName, criteria, criteriaSummary } = await req.json();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const cms = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const normalizedEmail = email.toLowerCase().trim();

  // Find or create lead.
  let { data: lead } = await cms
    .from("leads")
    .select("id")
    .ilike("email", normalizedEmail)
    .limit(1)
    .single();

  if (!lead) {
    const service = criteria.type === "rent" ? "renter" : "buyer";
    const { data: newLead, error: leadErr } = await cms
      .from("leads")
      .insert({
        email: normalizedEmail,
        first_name: firstName || null,
        service,
        source: "property-alert",
        custom_fields: { source: "property-alert-manual" },
      })
      .select("id")
      .single();
    if (leadErr) return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
    lead = newLead;
  }

  // Create the saved search.
  const { data: search, error: searchErr } = await cms
    .from("saved_searches")
    .insert({
      email: normalizedEmail,
      criteria,
      criteria_summary: criteriaSummary,
      lead_id: lead.id,
      is_active: true,
    })
    .select("id")
    .single();

  if (searchErr) return NextResponse.json({ error: "Failed to create alert" }, { status: 500 });

  return NextResponse.json({ ok: true, id: search.id });
}
