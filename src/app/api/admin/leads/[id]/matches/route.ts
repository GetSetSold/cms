import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createMlsClient, rawCitiesFor } from "@/lib/mls";
import { createPreconServiceClient } from "@/lib/precon";
import { requireStaff } from "@/lib/auth";

/**
 * GET /api/admin/leads/[id]/matches
 * Returns MLS listings + pre-con projects matching the lead's subscriptions.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireStaff(["admin", "editor", "sales"]); }
  catch { return NextResponse.json({ error: "Not authorized." }, { status: 401 }); }
  const { id } = await params;

  const cms = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const mls = createMlsClient();
  const precon = createPreconServiceClient();

  // Get lead's subscriptions
  const [searchesRes, preconRes] = await Promise.all([
    cms.from("saved_searches").select("id, criteria, criteria_summary").eq("lead_id", id).eq("is_active", true),
    cms.from("precon_subscribers").select("id, filters").eq("lead_id", id).eq("is_active", true),
  ]);

  const searches = (searchesRes.data ?? []) as any[];
  const preconSubs = (preconRes.data ?? []) as any[];

  const mlsMatches: any[] = [];
  const preconMatches: any[] = [];

  // MLS matches from property alerts
  for (const s of searches) {
    const criteria = s.criteria as Record<string, any>;
    if (!criteria) continue;

    let mq = mls
      .from("grid")
      .select("ListingKey, ListingId, ListPrice, TotalActualRent, UnparsedAddress, City, BedroomsTotal, BathroomsTotalInteger, StructureTypeText, Media")
      .order("OriginalEntryTimestamp", { ascending: false })
      .limit(6);

    if (criteria.cities && Array.isArray(criteria.cities) && criteria.cities.length) {
      const allVariants: string[] = [];
      for (const c of criteria.cities) {
        try { allVariants.push(...await rawCitiesFor(c)); }
        catch { allVariants.push(c); }
      }
      mq = mq.in("City", [...new Set(allVariants)]);
    } else if (criteria.city) {
      mq = mq.ilike("City", `%${criteria.city}%`);
    }
    if (criteria.beds) mq = mq.gte("BedroomsTotal", parseInt(criteria.beds));
    if (criteria.baths) mq = mq.gte("BathroomsTotalInteger", parseFloat(criteria.baths));
    if (criteria.minPrice) mq = mq.gte("ListPrice", parseInt(criteria.minPrice));
    if (criteria.maxPrice) mq = mq.lte("ListPrice", parseInt(criteria.maxPrice));
    if (criteria.homeType) mq = mq.ilike("StructureTypeText", `%${criteria.homeType}%`);
    if (criteria.type === "rent") mq = mq.not("TotalActualRent", "is", null);
    if (criteria.type === "sale") mq = mq.eq("TotalActualRent", null);

    const { data } = await mq;
    for (const m of (data ?? []) as any[]) {
      mlsMatches.push({
        key: m.ListingKey,
        mls: m.ListingId,
        price: m.ListPrice ?? m.TotalActualRent,
        address: m.UnparsedAddress,
        city: m.City,
        beds: m.BedroomsTotal,
        baths: m.BathroomsTotalInteger,
        type: m.StructureTypeText,
        photo: Array.isArray(m.Media) ? m.Media[0] : m.Media,
        isRent: m.TotalActualRent != null,
        searchId: s.id,
        searchSummary: s.criteria_summary,
      });
    }
  }

  // Pre-con matches from subscriptions
  for (const sub of preconSubs) {
    const f = sub.filters as any;
    let pq = precon.from("projects").select("id, slug, project_name, city, p_start_price, main_image_url, builder:builders(builder_name, slug)").limit(6);

    if (f && !f.all_projects) {
      if (f.cities?.length) pq = pq.in("city", f.cities);
      if (f.min_price) pq = pq.gte("p_start_price", f.min_price);
      if (f.max_price) pq = pq.lte("p_start_price", f.max_price);
    }

    const { data } = await pq;
    for (const p of (data ?? []) as any[]) {
      preconMatches.push({
        slug: p.slug,
        name: p.project_name,
        city: p.city,
        price: p.p_start_price,
        image: p.main_image_url,
        builder: p.builder?.builder_name,
        builderSlug: p.builder?.slug,
      });
    }
  }

  // Dedupe MLS by ListingKey
  const seen = new Set();
  const uniqueMls = mlsMatches.filter((m) => {
    if (seen.has(m.key)) return false;
    seen.add(m.key);
    return true;
  });

  return NextResponse.json({
    mls: uniqueMls.slice(0, 12),
    precon: preconMatches.slice(0, 6),
    hasSubscriptions: searches.length > 0 || preconSubs.length > 0,
  });
}
