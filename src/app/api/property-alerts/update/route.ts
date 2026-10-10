import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Update a saved search's criteria.
 * PUT /api/property-alerts { id, criteria, criteriaSummary }
 */
export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { id, criteria, criteriaSummary } = await req.json();
  if (!id || !criteria) return NextResponse.json({ error: "id and criteria required" }, { status: 400 });

  // Verify the search belongs to this user (by user_id or email).
  const { data: existing } = await supabase
    .from("saved_searches")
    .select("id, email, user_id")
    .eq("id", id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const owns = existing.user_id === user.id || existing.email?.toLowerCase() === user.email?.toLowerCase();
  if (!owns) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { error } = await supabase
    .from("saved_searches")
    .update({ criteria, criteria_summary: criteriaSummary || null, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
