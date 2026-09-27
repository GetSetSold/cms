import { requireStaff } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProjectsManager } from "@/components/admin/precon/ProjectsManager";
import { createPreconServiceClient } from "@/lib/precon";

export default async function PreconProjectsPage() {
  await requireStaff(["admin", "editor"]);
  const supabase = createPreconServiceClient();
  const [{ data: projects }, { data: builders }] = await Promise.all([
    supabase.from("projects").select("*").order("created_at", { ascending: false }),
    supabase.from("builders").select("*").order("builder_name"),
  ]);
  return (
    <>
      <AdminPageHeader title="Pre-Construction — Projects" />
      <div className="flex flex-col gap-6 p-8">
        {!builders?.length ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Add a builder first before adding projects.</p> : null}
        <ProjectsManager initial={projects ?? []} builders={builders ?? []} />
      </div>
    </>
  );
}
