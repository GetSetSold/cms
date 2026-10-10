import { createClient } from "@/lib/supabase/server";
import { createMlsClient, type GridListing } from "@/lib/mls";

export type FeaturedListingRow = {
  id: string; source_type: "brokerage" | "friend" | "private"; listing_key: string | null;
  is_active: boolean; sort_order: number; address: string | null; price: number | null;
  bed: number | null; bath: number | null; sqft: number | null; image_url: string | null;
  link: string | null; note: string | null;
};

/** Live-resolved MLS details for a featured row (admin list). */
export type FeaturedMlsDetails = {
  listingId: string | null;
  address: string | null;
  city: string | null;
  price: number | null;
  isSale: boolean;
  image: string | null;
};

export type PrivateListingView = {
  id: string; href: string; image: string | null; priceLabel: string;
  address: string; bed: number | null; bath: number | null; sqft: number | null; note: string | null;
};

/** Fetches your curated list and resolves any MLS-linked rows live against
 *  the board-wide DDF data (one batched query, not one per row) — a listing
 *  that's since sold/expired/mistyped is simply dropped rather than shown
 *  broken. Returns the two kinds separately, in their original combined
 *  order, since MLS-linked ones render through the existing ListingCard
 *  (real GridListing shape) and private ones need their own simple card. */
export async function getFeaturedListings(): Promise<{ order: string[]; mlsListings: Record<string, GridListing>; privateListings: Record<string, PrivateListingView> }> {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("featured_listings").select("*").eq("is_active", true).order("sort_order");
  if (!rows?.length) return { order: [], mlsListings: {}, privateListings: {} };

  const keys = rows.map((r) => r.listing_key).filter((k): k is string => !!k);
  let liveByKey: Record<string, GridListing> = {};
  if (keys.length) {
    const mls = createMlsClient();
    const { data: live } = await mls.from("grid").select("*").in("ListingKey", keys);
    liveByKey = Object.fromEntries((live ?? []).map((l) => [l.ListingKey, l as GridListing]));
  }

  const order: string[] = [];
  const mlsListings: Record<string, GridListing> = {};
  const privateListings: Record<string, PrivateListingView> = {};

  for (const r of rows as FeaturedListingRow[]) {
    if (r.listing_key) {
      const live = liveByKey[r.listing_key];
      if (!live) continue; // no longer resolves — skip rather than show broken data
      mlsListings[r.id] = live;
      order.push(r.id);
    } else {
      privateListings[r.id] = {
        id: r.id, href: r.link || "#", image: r.image_url,
        priceLabel: r.price ? `$${r.price.toLocaleString()}` : "Call for price",
        address: r.address ?? "", bed: r.bed, bath: r.bath, sqft: r.sqft, note: r.note,
      };
      order.push(r.id);
    }
  }

  return { order, mlsListings, privateListings };
}
