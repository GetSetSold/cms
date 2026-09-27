import { requireStaff } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BuildersManager } from "@/components/admin/precon/BuildersManager";

export default async function PreconBuildersPage() {
  const { supabase } = await requireStaff(["admin", "editor"]);
  const { data } = await supabase.from("precon_builders").select("*").order("sort_order");
  return (
    <>
      <AdminPageHeader title="Pre-Construction — Builders" />
      <div className="flex flex-col gap-6 p-8">
        <BuildersManager initial={data ?? []} />
      </div>
    </>
  );
}
