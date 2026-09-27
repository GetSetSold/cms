import { requireStaff } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ModelsManager } from "@/components/admin/precon/ModelsManager";

export default async function PreconModelsPage() {
  const { supabase } = await requireStaff(["admin", "editor"]);
  const [{ data: models }, { data: projects }] = await Promise.all([
    supabase.from("precon_models").select("*, project:precon_projects(id,name)").order("sort_order"),
    supabase.from("precon_projects").select("id,name").order("name"),
  ]);
  return (
    <>
      <AdminPageHeader title="Pre-Construction — Models" />
      <div className="flex flex-col gap-6 p-8">
        {!projects?.length ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Add a project first before adding models.</p> : null}
        <ModelsManager initial={(models ?? []) as any} projects={projects ?? []} />
      </div>
    </>
  );
}
