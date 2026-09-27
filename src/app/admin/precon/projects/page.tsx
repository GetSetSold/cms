import { requireStaff } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProjectsManager } from "@/components/admin/precon/ProjectsManager";

export default async function PreconProjectsPage() {
  const { supabase } = await requireStaff(["admin", "editor"]);
  const [{ data: projects }, { data: builders }] = await Promise.all([
    supabase.from("precon_projects").select("*, builder:precon_builders(id,name)").order("sort_order"),
    supabase.from("precon_builders").select("id,name").order("name"),
  ]);
  return (
    <>
      <AdminPageHeader title="Pre-Construction — Projects" />
      <div className="flex flex-col gap-6 p-8">
        {!builders?.length ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Add a builder first before adding projects.</p> : null}
        <ProjectsManager initial={(projects ?? []) as any} builders={builders ?? []} />
      </div>
    </>
  );
}
