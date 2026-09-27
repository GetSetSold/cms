import { requireStaff } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FeaturedListingsManager } from "@/components/admin/FeaturedListingsManager";
import type { FeaturedListingRow } from "@/lib/featuredListings";

export default async function FeaturedListingsPage() {
  const { supabase } = await requireStaff(["admin", "editor"]);
  const [{ data: rows }, { data: settings }] = await Promise.all([
    supabase.from("featured_listings").select("*").order("sort_order"),
    supabase.from("site_settings").select("mls_office_key").eq("id", 1).single(),
  ]);
  return (
    <>
      <AdminPageHeader title="Featured Listings" />
      <div className="flex flex-col gap-6 p-8">
        <p className="text-muted">
          Curated list shown on the site — separate from the full live listings feed. Pull all of your brokerage's listings at once by office key,
          add a friend agent's listing by MLS #, or add a fully private, off-MLS listing.
        </p>
        <FeaturedListingsManager initial={(rows ?? []) as FeaturedListingRow[]} initialOfficeKey={settings?.mls_office_key ?? ""} />
      </div>
    </>
  );
}
