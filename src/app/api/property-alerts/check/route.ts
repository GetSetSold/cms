import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createMlsClient, rawCitiesFor } from "@/lib/mls";

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
      // Resolve each normalized city to its raw variants (e.g., "Caledon" -> ["Caledon (Bolton West)", ...]).
      const allVariants: string[] = [];
      for (const c of criteria.cities) {
        try {
          const variants = await rawCitiesFor(c);
          allVariants.push(...variants);
        } catch {
          allVariants.push(c);
        }
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

    // Update last_notified_at and send email if we found matches (and not dry run).
    if (!dryRun && matchList.length > 0) {
      await cms.from("saved_searches").update({ last_notified_at: new Date().toISOString() }).eq("id", s.id);

      // Send email via send-email edge function (requires lead_id).
      if (s.lead_id) {
        const subject = `${matchList.length} new ${matchList.length === 1 ? "listing" : "listings"} matching your search`;
        const body = buildAlertEmail(s.criteria_summary || "Your saved search", matchList, s.unsubscribe_token);
        try {
          await cms.functions.invoke("send-email", {
            body: { lead_id: s.lead_id, subject, body },
          });
          results[results.length - 1].emailSent = true;
        } catch (e) {
          results[results.length - 1].emailError = e instanceof Error ? e.message : "Failed";
        }
      } else {
        results[results.length - 1].emailError = "No lead_id linked";
      }
    }
  }

  return NextResponse.json({ dryRun, checked: results.length, results });
}

function buildAlertEmail(criteriaSummary: string, matches: any[], unsubscribeToken: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cms.rohit-910.workers.dev";
  const cards = matches.map((m) => `
    <div style="margin:20px 32px;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
      ${m.photo ? `<img src="${m.photo}" alt="" style="width:100%;height:auto;display:block;">` : ""}
      <div style="padding:16px 20px;">
        <div style="font-size:18px;font-weight:700;color:#111;">$${Number(m.price).toLocaleString()}</div>
        <div style="font-size:14px;color:#333;margin:4px 0;">${m.address}, ${m.city}</div>
        <div style="font-size:13px;color:#666;">${m.beds ? `${m.beds} bd` : ""}${m.beds && m.baths ? " · " : ""}${m.baths ? `${m.baths} ba` : ""}${m.type ? ` · ${m.type}` : ""}</div>
        <a href="${siteUrl}/real-estate/${encodeURIComponent(m.key)}" style="display:inline-block;margin-top:12px;background:#0066cc;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;">View Listing</a>
      </div>
    </div>`).join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;">
<div style="background:#111111;color:#ffffff;padding:24px 32px;text-align:center;">
<div style="font-size:20px;font-weight:700;letter-spacing:1px;">GETSETSOLD<span style="color:#0066cc;">.ca</span></div>
<div style="font-size:12px;color:#999;margin-top:4px;">New listings matching your search</div>
</div>
<div style="padding:28px 32px 8px;">
<p style="font-size:16px;color:#111;margin:0 0 8px;">Hi there,</p>
<p style="font-size:14px;color:#333;line-height:1.6;margin:0;">
<strong>${matches.length} new ${matches.length === 1 ? "listing" : "listings"}</strong> match your saved search:
<span style="background:#f0f4fa;padding:2px 8px;border-radius:4px;font-size:13px;">${criteriaSummary}</span>
</p>
</div>
${cards}
<div style="text-align:center;padding:8px 32px 28px;">
<p style="font-size:13px;color:#666;margin-top:16px;">
<a href="${siteUrl}/property-alerts/manage" style="color:#0066cc;">Manage your alerts</a> ·
<a href="${siteUrl}/api/property-alerts/unsubscribe?token=${unsubscribeToken}" style="color:#0066cc;">Unsubscribe</a>
</p>
</div>
<div style="background:#f5f5f5;padding:20px 32px;text-align:center;">
<p style="font-size:12px;color:#999;margin:0;">GetSetSold.ca · Lombard Group Real Estate Inc., Brokerage<br>You're receiving this because you saved a search on our site.</p>
</div>
</div></body></html>`;
}
