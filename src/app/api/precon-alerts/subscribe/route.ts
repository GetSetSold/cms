import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Public pre-con alert signup.
 * Uses precon_subscriptions table directly.
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

    // Check existing.
    const { data: existing } = await supabase
      .from("precon_subscriptions")
      .select("id, is_active")
      .eq("email", normalized)
      .maybeSingle();

    if (existing) {
      if (!(existing as any).is_active) {
        await supabase.from("precon_subscriptions")
          .update({ is_active: true, filters: cleanFilters })
          .eq("id", (existing as any).id);
      }
      return NextResponse.json({ ok: true, alreadyExists: true });
    }

    const { error } = await supabase.from("precon_subscriptions").insert({
      email: normalized,
      first_name: firstName?.trim() || null,
      filters: cleanFilters,
      is_active: true,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, alreadyExists: false });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
