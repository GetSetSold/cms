import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createMlsClient } from "@/lib/mls";

/**
 * Check saved searches for new matching listings.
 * GET /api/property-alerts/check?dryRun=true
 *
 * For each active saved search, finds listings in the MLS grid matching
 * the criteria that were added since last_notified_at (or last 24h).
 *
 * Query params:
 *   dryRun=true  — return matches without sending emails or updating timestamps.
 *   email=...    — only check searches for this email (for testing).
 */
export async function GET(req: NextRequest) {
  const dryRun = req.nextUrl.searchParams.get("dryRun") === "true";
  const filterEmail = req.nextUrl.searchParams.get("email");

  const cms = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const mls = createMlsClient();

  // Get active saved searches.
  let q = cms.from("saved_searches").select("*").eq("is_active", true);
  if (filterEmail) q = q.eq("email", filterEmail.toLowerCase().trim());
  const { data: searches, error: sErr } = await q;
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  const results: any[] = [];

  for (const s of searches ?? []) {
    const criteria = s.criteria as Record<string, string>;
    const since = s.last_notified_at
      ? new Date(s.last_notified_at)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Build MLS query from criteria.
    let mq = mls
      .from("grid")
      .select("ListingKey, ListingId, ListPrice, TotalActualRent, UnparsedAddress, City, BedroomsTotal, BathroomsTotalInteger, StructureTypeText, Media")
      .gte("OriginalEntryTimestamp", since.toISOString())
      .limit(10);

    if (criteria.cities && Array.isArray(criteria.cities) && criteria.cities.length) {
      // Handle city variants (e.g., "Toronto (Downtown)" -> normalized).
      // For now, use direct match; the check endpoint resolves via rawCitiesFor if needed.
      mq = mq.in("City", criteria.cities);
    } else if (criteria.city) {
      mq = mq.ilike("City", `%${criteria.city}%`);
    }
    if (criteria.beds) mq = mq.gte("BedroomsTotal", parseInt(criteria.beds));
    if (criteria.baths) mq = mq.gte("BathroomsTotalInteger", parseFloat(criteria.baths));
    if (criteria.minPrice) mq = mq.gte("ListPrice", parseInt(criteria.minPrice));
    if (criteria.maxPrice) mq = mq.lte("ListPrice", parseInt(criteria.maxPrice));
    if (criteria.homeType) mq = mq.ilike("StructureTypeText", `%${criteria.homeType}%`);
    if (criteria.type === "rent") mq = mq.not("TotalActualRent", "is", null);
    if (criteria.type === "sale") mq = mq.not("ListPrice", "is", null);

    const { data: matches, error: mErr } = await mq;
    if (mErr) {
      results.push({ email: s.email, error: mErr.message });
      continue;
    }

    const matchList = (matches ?? []).map((m: any) => ({
      key: m.ListingKey,
      mls: m.ListingId,
      price: m.ListPrice ?? m.TotalActualRent,
      address: m.UnparsedAddress,
      city: m.City,
      beds: m.BedroomsTotal,
      baths: m.BathroomsTotalInteger,
      type: m.StructureTypeText,
      photo: m.Media,
    }));

    results.push({
      email: s.email,
      criteria: s.criteria_summary,
      newMatches: matchList.length,
      matches: matchList,
      wouldSend: matchList.length > 0 && !dryRun,
    });

    // Update last_notified_at if we found matches (and not dry run).
    if (!dryRun && matchList.length > 0) {
      await cms.from("saved_searches").update({ last_notified_at: new Date().toISOString() }).eq("id", s.id);
      // TODO: Send email via send-email function.
    }
  }

  return NextResponse.json({ dryRun, checked: results.length, results });
}
