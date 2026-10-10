import { requireStaff } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FeaturedListingsManager } from "@/components/admin/FeaturedListingsManager";
import type { FeaturedListingRow, FeaturedMlsDetails } from "@/lib/featuredListings";
import { createMlsClient } from "@/lib/mls";

export default async function FeaturedListingsPage() {
  const { supabase } = await requireStaff(["admin", "editor"]);
  const [{ data: rows }, { data: settings }] = await Promise.all([
    supabase.from("featured_listings").select("*").order("sort_order"),
    supabase.from("site_settings").select("mls_office_key").eq("id", 1).single(),
  ]);
  const list = (rows ?? []) as FeaturedListingRow[];
  // Resolve MLS-linked rows live (one batched query per table): real MLS# (ListingId),
  // address, price, sale/rent, thumbnail. Unresolvable keys render with a warning.
  const details: Record<string, FeaturedMlsDetails> = {};
  const keys = list.map((r) => r.listing_key).filter((k): k is string => !!k);
  if (keys.length) {
    const mls = createMlsClient();
    const [{ data: gridRows }, { data: propRows }] = await Promise.all([
      mls.from("grid").select("ListingKey,UnparsedAddress,City,ListPrice,Media").in("ListingKey", keys),
      mls.from("property").select("ListingKey,ListingId").in("ListingKey", keys),
    ]);
    const idByKey: Record<string, string | null> = Object.fromEntries(
      ((propRows ?? []) as { ListingKey: string; ListingId: string | null }[]).map((p) => [p.ListingKey, p.ListingId]),
    );
    for (const g of (gridRows ?? []) as { ListingKey: string; UnparsedAddress: string | null; City: string | null; ListPrice: number | null; Media: string | null }[]) {
      details[g.ListingKey] = {
        listingId: idByKey[g.ListingKey] ?? null,
        address: g.UnparsedAddress,
        city: g.City,
        price: g.ListPrice,
        isSale: g.ListPrice != null,
        image: g.Media,
      };
    }
  }
  return (
    <>
      <AdminPageHeader title="Featured Listings" />
      <div className="flex flex-col gap-6 p-8">
        <p className="text-muted">
          Curated list shown on the site — separate from the full live listings feed. Pull all of your brokerage's listings at once by office key,
          add a friend agent's listing by MLS #, or add a fully private, off-MLS listing.
        </p>
        <FeaturedListingsManager initial={list} initialOfficeKey={settings?.mls_office_key ?? ""} details={details} />
      </div>
    </>
  );
}
