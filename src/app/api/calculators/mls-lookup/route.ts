import { NextResponse } from "next/server";
import { createMlsClient } from "@/lib/mls";

/**
 * Public MLS lookup for the affordability calculator's property lookup.
 * Returns only non-sensitive display fields. Tight rate limit (in-memory,
 * per instance) to keep Supabase free-plan usage low.
 */
export const dynamic = "force-dynamic";

const hits = new Map<string, { n: number; reset: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_MIN = 20;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.reset) {
    hits.set(ip, { n: 1, reset: now + WINDOW_MS });
    return false;
  }
  rec.n += 1;
  return rec.n > MAX_PER_MIN;
}

function ipOf(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export async function GET(req: Request) {
  if (rateLimited(ipOf(req))) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) return NextResponse.json({ error: "Enter at least 3 characters." }, { status: 400 });

  const mls = createMlsClient();
  const isPostal = /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/.test(q);
  const digitsOnly = q.replace(/\D/g, "");
  const isMlsNum = /^\d{6,}$/.test(digitsOnly);

  try {
    // MLS number is the public ListingId (e.g. "X13841510"). Grid lacks that
    // column, so search the property table by ListingId; fall back to grid by
    // ListingKey for raw numeric keys. Address/postal use the faster grid.
    if (isMlsNum) {
      const { data, error } = await mls
        .from("property")
        .select("ListingKey,ListingId,UnparsedAddress,City,ListPrice,BedroomsTotal,BathroomsTotalInteger,LivingArea,PropertySubType,Media")
        .ilike("ListingId", `%${digitsOnly}%`)
        .limit(1)
        .maybeSingle();
      if (error) return NextResponse.json({ error: "Lookup failed. Please try again." }, { status: 500 });
      if (data) {
        const d = data as Record<string, unknown>;
        const media = d.Media;
        const photo = Array.isArray(media) && media.length > 0 ? String(media[0]) : null;
        return NextResponse.json({
          ok: true,
          listing: {
            mlsNumber: String(d.ListingId ?? d.ListingKey ?? ""),
            price: Number(d.ListPrice) || 0,
            address: d.UnparsedAddress,
            city: d.City,
            beds: d.BedroomsTotal,
            baths: d.BathroomsTotalInteger,
            sqft: d.LivingArea,
            propertyType: d.PropertySubType,
            photo,
          },
        });
      }
      // Fall through to grid by ListingKey below.
    }

    let query = mls
      .from("grid")
      .select("ListingKey,UnparsedAddress,City,PostalCode,ListPrice,BedroomsTotal,BathroomsTotal,LivingArea,PropertyType,Media")
      .limit(1);

    if (isMlsNum) {
      query = query.eq("ListingKey", digitsOnly);
    } else if (isPostal) {
      query = query.ilike("PostalCode", `${q.replace(/\s/g, "")}%`);
    } else {
      query = query.ilike("UnparsedAddress", `%${q}%`);
    }

    const { data, error } = await query.maybeSingle();
    if (error) return NextResponse.json({ error: "Lookup failed. Please try again." }, { status: 500 });
    if (!data) return NextResponse.json({ ok: true, listing: null });

    const media = (data as Record<string, unknown>).Media;
    const photo = Array.isArray(media) && media.length > 0 ? String(media[0]) : null;

    return NextResponse.json({
      ok: true,
      listing: {
        mlsNumber: (data as Record<string, unknown>).ListingKey,
        price: Number((data as Record<string, unknown>).ListPrice) || 0,
        address: (data as Record<string, unknown>).UnparsedAddress,
        city: (data as Record<string, unknown>).City,
        beds: (data as Record<string, unknown>).BedroomsTotal,
        baths: (data as Record<string, unknown>).BathroomsTotal,
        sqft: (data as Record<string, unknown>).LivingArea,
        propertyType: (data as Record<string, unknown>).PropertyType,
        photo,
      },
    });
  } catch {
    return NextResponse.json({ error: "Lookup failed. Please try again." }, { status: 500 });
  }
}
