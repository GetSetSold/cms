import { requireStaff } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AmenitiesManager } from "@/components/admin/precon/AmenitiesManager";
import { createPreconServiceClient } from "@/lib/precon";

export default async function PreconAmenitiesPage() {
  await requireStaff(["admin", "editor"]);
  const supabase = createPreconServiceClient();
  const { data } = await supabase.from("amenities").select("*").order("title");
  return (
    <>
      <AdminPageHeader title="Pre-Construction — Amenities" />
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <p className="max-w-3xl text-sm text-muted">Shared library — tick amenities onto any project from the project&apos;s row on the Projects page.</p>
        <AmenitiesManager initial={(data ?? []) as any} />
      </div>
    </>
  );
}
