import { requireStaff } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FeaturedListingsManager } from "@/components/admin/FeaturedListingsManager";
import type { FeaturedListingRow } from "@/lib/featuredListings";

export default async function FeaturedListingsPage() {
  const { supabase } = await requireStaff(["admin", "editor"]);
  const { data } = await supabase.from("featured_listings").select("*").order("sort_order");
  return (
    <>
      <AdminPageHeader title="Featured Listings" />
      <div className="flex flex-col gap-6 p-8">
        <p className="text-muted">
          Curated list shown on the site — separate from the full live listings feed. Add by MLS # (pulls live price/photo from the board-wide DDF feed —
          works for your own brokerage's listings or a friend agent's) or as a fully private, off-MLS listing.
        </p>
        <FeaturedListingsManager initial={(data ?? []) as FeaturedListingRow[]} />
      </div>
    </>
  );
}
