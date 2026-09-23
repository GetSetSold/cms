import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { PageBuilder } from "@/components/admin/PageBuilder";
import type { Page, Section, SvgAsset } from "@/lib/types";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff(["admin", "editor"]);
  const [{ data: page }, { data: sections }, { data: blockTypes }, { data: svgs }] = await Promise.all([
    supabase.from("pages").select("*").eq("id", id).maybeSingle(),
    supabase.from("page_sections").select("*").eq("page_id", id).order("position"),
    supabase.from("block_types").select("key,name,category,default_data").eq("is_active", true).order("name"),
    supabase.from("svg_assets").select("id,name,markup,tags").order("name"),
  ]);
  if (!page) notFound();
  return (
    <PageBuilder page={page as Page} sections={(sections ?? []) as Section[]}
      blockTypes={blockTypes ?? []} svgs={(svgs ?? []) as SvgAsset[]} />
  );
}
