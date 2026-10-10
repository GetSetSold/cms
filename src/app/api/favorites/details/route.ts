import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createMlsClient } from "@/lib/mls";

/**
 * Get user's favorite listings with details.
 * GET /api/favorites/details
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { data: favs } = await supabase
    .from("favorite_listings")
    .select("listing_key, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (!favs?.length) return NextResponse.json({ favorites: [] });

  const keys = favs.map((f) => f.listing_key);
  const mls = createMlsClient();
  const { data: listings } = await mls
    .from("grid")
    .select("ListingKey, ListingId, ListPrice, TotalActualRent, UnparsedAddress, City, BedroomsTotal, BathroomsTotalInteger, Media")
    .in("ListingKey", keys);

  const byKey = new Map((listings ?? []).map((l: any) => [l.ListingKey, l]));
  const result = favs.map((f) => {
    const l: any = byKey.get(f.listing_key);
    if (!l) return { key: f.listing_key, missing: true };
    return {
      key: l.ListingKey,
      mls: l.ListingId,
      price: l.ListPrice ?? l.TotalActualRent,
      isRent: l.TotalActualRent != null && l.ListPrice == null,
      address: l.UnparsedAddress,
      city: l.City,
      beds: l.BedroomsTotal,
      baths: l.BathroomsTotalInteger,
      photo: l.Media,
      savedAt: f.created_at,
    };
  });

  return NextResponse.json({ favorites: result });
}
