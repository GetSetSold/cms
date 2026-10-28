import { requireStaff } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { RedirectsManager } from "@/components/admin/RedirectsManager";

export default async function RedirectsPage() {
  const { supabase } = await requireStaff(["admin", "editor"]);
  const [{ data: redirects }, { data: pages }] = await Promise.all([
    supabase.from("redirects").select("*").order("source"),
    supabase.from("pages").select("slug").eq("status", "published"),
  ]);
  return (
    <>
      <AdminPageHeader title="Redirects" />
      <div className="flex flex-col gap-6 p-8">
        <p className="text-muted">
          Page and short-link redirects, managed here — no code push needed. A redirect fires only
          when its source would otherwise 404 as a CMS page, so it can never override a real page
          or route. Changes take effect on the next hit of that URL.
        </p>
        <RedirectsManager
          initial={(redirects ?? []) as any[]}
          pageSlugs={(pages ?? []).map((p: any) => p.slug as string)}
        />
      </div>
    </>
  );
}
