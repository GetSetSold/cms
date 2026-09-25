import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { BlogAuthor, BlogCategory, BlogPost } from "@/lib/types";

export const getCategories = cache(async (): Promise<BlogCategory[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("blog_categories").select("*").order("sort_order");
  return (data ?? []) as BlogCategory[];
});

export const getAuthors = cache(async (): Promise<BlogAuthor[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("blog_authors").select("*").order("name");
  return (data ?? []) as BlogAuthor[];
});

export const getCategoryBySlug = cache(async (slug: string): Promise<BlogCategory | null> => {
  const cats = await getCategories();
  return cats.find((c) => c.slug === slug) ?? null;
});

export async function getPosts(opts: { categoryId?: string; preview?: boolean; limit?: number } = {}) {
  const supabase = await createClient();
  let q = supabase.from("blog_posts").select("*, blog_categories(name,slug)").order("publish_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
  if (!opts.preview) {
    q = q.in("status", ["published", "scheduled"]).or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`);
  }
  if (opts.categoryId) q = q.eq("category_id", opts.categoryId);
  if (opts.limit) q = q.limit(opts.limit);
  const { data } = await q;
  return data ?? [];
}

export async function getPostBySlug(categorySlug: string, slug: string, preview = false) {
  const category = await getCategoryBySlug(categorySlug);
  if (!category) return null;
  const supabase = await createClient();
  let q = supabase.from("blog_posts").select("*, blog_authors(name,role,bio,avatar_svg_id)").eq("category_id", category.id).eq("slug", slug);
  if (!preview) q = q.in("status", ["published", "scheduled"]).or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`);
  const { data } = await q.maybeSingle();
  return data ? { post: data as BlogPost, category } : null;
}
