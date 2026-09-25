import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { PostEditor } from "@/components/admin/PostEditor";
import type { BlogPost, CmsForm, SvgAsset } from "@/lib/types";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff(["admin", "editor"]);
  const [{ data: post }, { data: categories }, { data: blockTypes }, { data: svgs }, { data: forms }] = await Promise.all([
    supabase.from("blog_posts").select("*").eq("id", id).maybeSingle(),
    supabase.from("blog_categories").select("*").order("sort_order"),
    supabase.from("block_types").select("key,name,category,default_data").eq("is_active", true).order("name"),
    supabase.from("svg_assets").select("id,name,markup,tags").order("name"),
    supabase.from("forms").select("*").order("name"),
  ]);
  if (!post) notFound();
  return (
    <PostEditor initial={post as BlogPost} categories={categories ?? []} blockTypes={blockTypes ?? []}
      svgs={(svgs ?? []) as SvgAsset[]} forms={(forms ?? []) as CmsForm[]} />
  );
}
