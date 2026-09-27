import { createClient } from "@/lib/supabase/server";

export type PreconBuilder = {
  id: string; slug: string; name: string; logo_url: string | null; tagline: string | null;
  description: string | null; incentive_title: string | null; incentive_description: string | null;
};

export type PreconProject = {
  id: string; builder_id: string; slug: string; name: string; city: string | null; address: string | null;
  latitude: number | null; longitude: number | null; status: "Selling Now" | "Coming Soon" | "Sold Out";
  price_from: number | null; beds_min: number | null; beds_max: number | null; baths_min: number | null; baths_max: number | null;
  sqft_min: number | null; sqft_max: number | null; vip_release_date: string | null; cashback_amount: number | null;
  description: string | null; gallery: string[]; amenities: string[];
};

export type PreconModel = {
  id: string; project_id: string; slug: string; name: string; status: "Move-In Ready" | "Pre-Construction";
  price_from: number | null; bedrooms: number | null; bathrooms: number | null; sqft: number | null; storeys: number | null;
  building_type: string | null; move_in_date: string | null; cashback_amount: number | null;
  gallery: string[]; floor_plans: string[]; payment_plan: { milestone: string; percent: number }[]; amenities: string[];
};

export type ProjectFilters = {
  city?: string; status?: string; minPrice?: number; maxPrice?: number; minBeds?: number; minBaths?: number; vipOnly?: boolean;
};

export async function getPreconStats() {
  const supabase = await createClient();
  const [{ count: projects }, { count: builders }, { data: cityRows }, { count: vip }] = await Promise.all([
    supabase.from("precon_projects").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("precon_builders").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("precon_projects").select("city").eq("is_active", true),
    supabase.from("precon_projects").select("id", { count: "exact", head: true }).eq("is_active", true).not("vip_release_date", "is", null),
  ]);
  const cities = new Set((cityRows ?? []).map((r) => r.city).filter(Boolean));
  return { projects: projects ?? 0, builders: builders ?? 0, cities: cities.size, vip: vip ?? 0 };
}

export async function getProjects(filters: ProjectFilters = {}): Promise<(PreconProject & { builder: PreconBuilder })[]> {
  const supabase = await createClient();
  let q = supabase.from("precon_projects").select("*, builder:precon_builders(*)").eq("is_active", true).order("sort_order");
  if (filters.city) q = q.eq("city", filters.city);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.minPrice != null) q = q.gte("price_from", filters.minPrice);
  if (filters.maxPrice != null) q = q.lte("price_from", filters.maxPrice);
  if (filters.minBeds != null) q = q.gte("beds_max", filters.minBeds);
  if (filters.minBaths != null) q = q.gte("baths_max", filters.minBaths);
  if (filters.vipOnly) q = q.not("vip_release_date", "is", null);
  const { data } = await q;
  return (data ?? []) as any;
}

export async function getCities(): Promise<{ city: string; count: number }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("precon_projects").select("city").eq("is_active", true);
  const counts = new Map<string, number>();
  for (const r of data ?? []) { if (r.city) counts.set(r.city, (counts.get(r.city) ?? 0) + 1); }
  return [...counts.entries()].map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count);
}

export async function getBuilders(): Promise<(PreconBuilder & { project_count: number })[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("precon_builders").select("*, precon_projects(count)").eq("is_active", true).order("sort_order");
  return (data ?? []).map((b: any) => ({ ...b, project_count: b.precon_projects?.[0]?.count ?? 0 }));
}

export async function getBuilder(slug: string) {
  const supabase = await createClient();
  const { data: builder } = await supabase.from("precon_builders").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (!builder) return null;
  const { data: projects } = await supabase.from("precon_projects").select("*").eq("builder_id", builder.id).eq("is_active", true).order("sort_order");
  return { builder: builder as PreconBuilder, projects: (projects ?? []) as PreconProject[] };
}

export async function getProject(builderSlug: string, projectSlug: string) {
  const supabase = await createClient();
  const { data: builder } = await supabase.from("precon_builders").select("*").eq("slug", builderSlug).maybeSingle();
  if (!builder) return null;
  const { data: project } = await supabase.from("precon_projects").select("*").eq("builder_id", builder.id).eq("slug", projectSlug).eq("is_active", true).maybeSingle();
  if (!project) return null;
  const { data: models } = await supabase.from("precon_models").select("*").eq("project_id", project.id).eq("is_active", true).order("sort_order");
  return { builder: builder as PreconBuilder, project: project as PreconProject, models: (models ?? []) as PreconModel[] };
}

export async function getModel(builderSlug: string, projectSlug: string, modelSlug: string) {
  const found = await getProject(builderSlug, projectSlug);
  if (!found) return null;
  const model = found.models.find((m) => m.slug === modelSlug);
  if (!model) return null;
  const siblings = found.models.filter((m) => m.slug !== modelSlug);
  return { builder: found.builder, project: found.project, model, siblings };
}
