import { requireStaff } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CategoriesManager } from "@/components/admin/CategoriesManager";
import type { BlogCategory, CmsForm, SvgAsset } from "@/lib/types";

export default async function CategoriesPage() {
  const { supabase } = await requireStaff(["admin", "editor"]);
  const [{ data: categories }, { data: blockTypes }, { data: svgs }, { data: forms }] = await Promise.all([
    supabase.from("blog_categories").select("*").order("sort_order"),
    supabase.from("block_types").select("key,name,category,default_data").eq("is_active", true).order("name"),
    supabase.from("svg_assets").select("id,name,markup,tags").order("name"),
    supabase.from("forms").select("*").order("name"),
  ]);
  return (
    <>
      <AdminPageHeader title="Categories" />
      <div className="flex flex-col gap-6 p-8">
        <p className="text-muted">Each category can have its own default blocks — set them once here, and every new post in that category starts pre-filled for consistency.</p>
        <CategoriesManager initial={(categories ?? []) as BlogCategory[]} blockTypes={blockTypes ?? []} svgs={(svgs ?? []) as SvgAsset[]} forms={(forms ?? []) as CmsForm[]} />
      </div>
    </>
  );
}
