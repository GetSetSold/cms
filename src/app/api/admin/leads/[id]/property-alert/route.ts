import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireStaff } from "@/lib/auth";

/** Admin property alert management (add/edit from lead Subscriptions tab). */

function buildSummary(c: any): string {
  const parts: string[] = [];
  const cities = Array.isArray(c.cities) && c.cities.length ? c.cities : c.city ? [c.city] : [];
  if (cities.length) parts.push(cities.join(", "));
  if (c.type === "rent") parts.push("For Rent");
  else if (c.type === "sale") parts.push("For Sale");
  if (c.minPrice || c.maxPrice) {
    const lo = c.minPrice ? `$${Number(c.minPrice).toLocaleString()}` : "";
    const hi = c.maxPrice ? `$${Number(c.maxPrice).toLocaleString()}` : "";
    parts.push(`${lo}–${hi}`.replace(/^–/, "Under ").replace(/–$/, "+"));
  }
  if (c.beds) parts.push(`${c.beds}+ bd`);
  if (c.baths) parts.push(`${c.baths}+ ba`);
  if (c.homeType) parts.push(c.homeType);
  return parts.join(" · ") || "Saved search";
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const { id } = await params;
  const body = await req.json();
  const { cities, type, minPrice, maxPrice, beds, baths, homeType } = body;

  const cms = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: lead } = await cms.from("leads").select("email").eq("id", id).single();
  const email = (lead as any)?.email?.toLowerCase().trim();
  if (!email) return NextResponse.json({ error: "Lead has no email" }, { status: 400 });

  const criteria: any = {};
  if (cities?.length) criteria.cities = Array.isArray(cities) ? cities : [cities];
  if (type) criteria.type = type; // "sale" | "rent"
  if (minPrice) criteria.minPrice = Number(minPrice);
  if (maxPrice) criteria.maxPrice = Number(maxPrice);
  if (beds) criteria.beds = String(beds);
  if (baths) criteria.baths = String(baths);
  if (homeType) criteria.homeType = homeType;

  const { data, error } = await cms.from("saved_searches").insert({
    email, lead_id: id, criteria,
    criteria_summary: buildSummary(criteria),
    is_active: true,
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: (data as any)?.id });
}

export async function PATCH(req: NextRequest) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const body = await req.json();
  const { search_id, is_active, cities, type, minPrice, maxPrice, beds, baths, homeType } = body;
  if (!search_id) return NextResponse.json({ error: "search_id required" }, { status: 400 });

  const cms = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const update: any = {};
  if (typeof is_active === "boolean") update.is_active = is_active;

  // If criteria fields provided, rebuild criteria + summary
  if (cities !== undefined || type !== undefined || minPrice !== undefined || maxPrice !== undefined) {
    const { data: existing } = await cms.from("saved_searches").select("criteria").eq("id", search_id).single();
    const criteria = { ...((existing as any)?.criteria ?? {}) };
    if (cities !== undefined) criteria.cities = Array.isArray(cities) ? cities : (cities ? [cities] : []);
    if (type !== undefined) criteria.type = type;
    if (minPrice !== undefined) criteria.minPrice = minPrice ? Number(minPrice) : undefined;
    if (maxPrice !== undefined) criteria.maxPrice = maxPrice ? Number(maxPrice) : undefined;
    if (beds !== undefined) criteria.beds = beds || undefined;
    if (baths !== undefined) criteria.baths = baths || undefined;
    if (homeType !== undefined) criteria.homeType = homeType || undefined;
    // Clean undefined
    Object.keys(criteria).forEach((k) => criteria[k] === undefined && delete criteria[k]);
    update.criteria = criteria;
    update.criteria_summary = buildSummary(criteria);
  }

  if (!Object.keys(update).length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  const { error } = await cms.from("saved_searches").update(update).eq("id", search_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  try { await requireStaff(["admin", "editor"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const search_id = req.nextUrl.searchParams.get("search_id");
  if (!search_id) return NextResponse.json({ error: "search_id required" }, { status: 400 });
  const cms = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { error } = await cms.from("saved_searches").delete().eq("id", search_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
