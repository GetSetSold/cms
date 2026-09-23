import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Page, Section, SiteSettings, SvgAsset } from "@/lib/types";

export const getSettings = cache(async (): Promise<SiteSettings> => {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("*").eq("id", 1).single();
  return data as SiteSettings;
});

/** Published page by slug ("home" for the site root). Pass preview=true to include drafts (editors only, via RLS). */
export const getPage = cache(async (slug: string, preview = false) => {
  const supabase = await createClient();
  let q = supabase.from("pages").select("*").eq("slug", slug);
  if (!preview) {
    q = q.in("status", ["published", "scheduled"])
      .or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`);
  }
  const { data: page } = await q.maybeSingle();
  if (!page) return null;

  const { data: sections } = await supabase
    .from("page_sections").select("*")
    .eq("page_id", page.id).eq("is_visible", true)
    .order("position");

  return { page: page as Page, sections: (sections ?? []) as Section[] };
});

/** Walks section data and returns every svg_id referenced anywhere. */
export function collectSvgIds(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => collectSvgIds(v, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (k.endsWith("svg_id") && typeof v === "string" && v) out.add(v);
      else collectSvgIds(v, out);
    }
  }
  return out;
}

export async function getSvgs(ids: Iterable<string>): Promise<Record<string, SvgAsset>> {
  const list = [...ids];
  if (!list.length) return {};
  const supabase = await createClient();
  const { data } = await supabase.from("svg_assets").select("id,name,markup,tags").in("id", list);
  return Object.fromEntries((data ?? []).map((s) => [s.id, s as SvgAsset]));
}

export async function getPublishedSlugs() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages").select("slug, updated_at, noindex")
    .in("status", ["published", "scheduled"])
    .or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`);
  return (data ?? []).filter((p) => !p.noindex);
}
