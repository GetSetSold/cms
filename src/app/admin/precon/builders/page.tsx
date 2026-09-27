import { requireStaff } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BuildersManager } from "@/components/admin/precon/BuildersManager";
import { createPreconServiceClient } from "@/lib/precon";

export default async function PreconBuildersPage() {
  await requireStaff(["admin", "editor"]);
  const supabase = createPreconServiceClient();
  const { data } = await supabase.from("builders").select("*").order("builder_name");
  return (
    <>
      <AdminPageHeader title="Pre-Construction — Builders" />
      <div className="flex flex-col gap-6 p-8">
        <p className="text-muted">This data lives in a separate project, shared with your main site — not in this CMS's own database.</p>
        <BuildersManager initial={data ?? []} />
      </div>
    </>
  );
}
