import { requireStaff } from "@/lib/auth";
import { PreconAdminTabs } from "@/components/admin/precon/PreconAdminTabs";
import { createPreconServiceClient } from "@/lib/precon";

export default async function PreconAdminPage() {
  await requireStaff(["admin", "editor"]);
  const supabase = createPreconServiceClient();
  const [builders, projects, models, amenities, promos] = await Promise.all([
    supabase.from("builders").select("*").order("builder_name"),
    supabase.from("projects").select("*").order("project_name"),
    supabase.from("home_models").select("*").order("model_name"),
    supabase.from("amenities").select("*").order("title"),
    supabase.from("promos").select("*").order("created_at", { ascending: false }),
  ]);
  return (
    <PreconAdminTabs
      data={{
        builders: (builders.data ?? []) as any,
        projects: (projects.data ?? []) as any,
        models: (models.data ?? []) as any,
        amenities: (amenities.data ?? []) as any,
        promos: (promos.data ?? []) as any,
      }}
    />
  );
}
