import { requireStaff } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ModelsManager } from "@/components/admin/precon/ModelsManager";
import { createPreconServiceClient } from "@/lib/precon";

export default async function PreconModelsPage() {
  await requireStaff(["admin", "editor"]);
  const supabase = createPreconServiceClient();
  const [{ data: models }, { data: projects }] = await Promise.all([
    supabase.from("home_models").select("*"),
    supabase.from("projects").select("*"),
  ]);
  return (
    <>
      <AdminPageHeader title="Pre-Construction — Models" />
      <div className="flex flex-col gap-6 p-8">
        {!projects?.length ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Add a project first before adding models.</p> : null}
        <ModelsManager initial={models ?? []} projects={projects ?? []} />
      </div>
    </>
  );
}
