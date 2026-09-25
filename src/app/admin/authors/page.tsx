import { requireStaff } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AuthorsManager } from "@/components/admin/AuthorsManager";
import type { BlogAuthor, SvgAsset } from "@/lib/types";

export default async function AuthorsPage() {
  const { supabase } = await requireStaff(["admin", "editor"]);
  const [{ data: authors }, { data: svgs }] = await Promise.all([
    supabase.from("blog_authors").select("*").order("name"),
    supabase.from("svg_assets").select("id,name,markup,tags").order("name"),
  ]);
  return (
    <>
      <AdminPageHeader title="Authors" />
      <div className="flex flex-col gap-6 p-8">
        <p className="text-muted">Set up an author once, then pick them on any post — no retyping name, role, or bio each time.</p>
        <AuthorsManager initial={(authors ?? []) as BlogAuthor[]} svgs={(svgs ?? []) as SvgAsset[]} />
      </div>
    </>
  );
}
