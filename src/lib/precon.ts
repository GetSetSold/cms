import { createClient } from "@supabase/supabase-js";

/** Read-only — safe to use from server components. RLS on that project only
 *  allows SELECT for anon, so this can never write even if misused. */
export function createPreconClient() {
  const url = process.env.NEXT_PUBLIC_PRECON_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_PRECON_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Pre-Con is not configured: NEXT_PUBLIC_PRECON_SUPABASE_URL and/or NEXT_PUBLIC_PRECON_SUPABASE_ANON_KEY are missing from the deployment environment.");
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Service-role — bypasses RLS entirely. SERVER-ONLY: import this exclusively
 *  inside API routes (never a "use client" file), and never let this key be
 *  a NEXT_PUBLIC_ variable. This is the only way writes work at all, since
 *  the CMS's own login session has no meaning to this separate project's
 *  "authenticated" RLS check. */
export function createPreconServiceClient() {
  const url = process.env.NEXT_PUBLIC_PRECON_SUPABASE_URL;
  const key = process.env.PRECON_SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Pre-Con admin is not configured: NEXT_PUBLIC_PRECON_SUPABASE_URL and/or the PRECON_SUPABASE_SERVICE_KEY secret are missing from the deployment environment.");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ---- Real schema types (confirmed from live sample data, not guessed) ----

export type Builder = {
  id: number; builder_name: string; slug: string; logo_url: string | null; description: string | null; banner_url: string | null;
};

export type Project = {
  id: string; project_name: string; slug: string; city: string | null; project_status: string | null;
  p_start_price: number | string | null; builder_id: number; main_image_url: string | null;
  beds: string | null; baths: string | null; sqft: string | null; // sqft is often a range like "1396 - 1687" — display as-is, don't parse
  vip_release: string | null; // "Yes"/"No" flag, not a date
  project_message: string | null; project_description: string | null; lat: number | null; lng: number | null;
};

export type Phase = {
  id: number; project_id: string; phase_name: string | null; status: string | null;
  starting_price: number | null; completion_year: number | null; description: string | null; slug: string | null;
};

export type HomeModel = {
  id: string; model_name: string | null; bedrooms: string | null; bathrooms: string | null; sqft: string | null;
  starting_price: string | null; storeys: string | null; building_type: string | null; title: string | null;
  description: string | null; slug: string | null; home_type_id: string | null; move_in_ready: boolean | null;
  project_id: string | null; model_image_url: string | null; phase_id: number | null;
};

export type Promo = {
  id: string; title: string | null; description: string | null; badge: string | null; show: boolean | null;
  start_date: string | null; end_date: string | null; builder_id: number | null; project_id: string | null;
  bullets: string[] | null; display_page: string | null; promo_type: string | null;
};

export type Amenity = { id: string; title: string | null; description: string | null; icon_url: string | null };
export type Floorplan = { id: string; model_id: string | null; floorplan_image_url: string | null; floorplan_name: string | null };
export type PaymentPlan = { id: string; project_id: string | null; home_type_id: string | null; title: string | null; total_amount: number | null; total_days: number | null; show: boolean | null };
export type PaymentInstallment = { id: string; payment_plan_id: string | null; amount: number; due_days: number | null; sort_order: number | null; description: string | null };

/** Images are polymorphic — one shared library, attached to anything via
 *  image_assignments.related_type/related_id. This resolves all images for
 *  one related row, in sort_order. */
async function getImagesFor(relatedType: string, relatedId: string) {
  const supabase = createPreconClient();
  const { data: assignments } = await supabase.from("image_assignments").select("image_id").eq("related_type", relatedType).eq("related_id", relatedId);
  const ids = (assignments ?? []).map((a) => a.image_id);
  if (!ids.length) return [];
  const { data: images } = await supabase.from("images").select("*").in("id", ids).order("sort_order");
  return images ?? [];
}

export async function getPreconStats() {
  const supabase = createPreconClient();
  const [{ count: projects }, { count: builders }, { data: cityRows }, { count: vip }] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact", head: true }),
    supabase.from("builders").select("id", { count: "exact", head: true }),
    supabase.from("projects").select("city"),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("vip_release", "Yes"),
  ]);
  const cities = new Set((cityRows ?? []).map((r) => r.city).filter(Boolean));
  return { projects: projects ?? 0, builders: builders ?? 0, cities: cities.size, vip: vip ?? 0 };
}

/** promos.bullets might be a real array, a JSON-encoded string, or a plain
 *  comma-separated string depending on how it was entered — handle all three. */
export function parsePromoBullets(bullets: unknown): string[] {
  if (!bullets) return [];
  if (Array.isArray(bullets)) return bullets.filter(Boolean);
  if (typeof bullets === "string") {
    const trimmed = bullets.trim();
    if (!trimmed) return [];
    try { const parsed = JSON.parse(trimmed); if (Array.isArray(parsed)) return parsed.filter(Boolean); } catch { /* fall through */ }
    return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function slugToCityName(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function getProjectsByCitySlug(citySlug: string): Promise<(Project & { builder: Builder })[]> {
  const supabase = createPreconClient();
  const cityName = slugToCityName(citySlug);
  const { data } = await supabase.from("projects").select("*, builder:builder_id(*)").ilike("city", `%${cityName}%`);
  return (data ?? []) as any;
}

export async function getBuilders(): Promise<(Builder & { project_count: number })[]> {
  const supabase = createPreconClient();
  const { data: builders } = await supabase.from("builders").select("*").order("builder_name");
  const { data: projects } = await supabase.from("projects").select("builder_id");
  const counts = new Map<number, number>();
  for (const p of projects ?? []) counts.set(p.builder_id, (counts.get(p.builder_id) ?? 0) + 1);
  return (builders ?? []).map((b) => ({ ...b, project_count: counts.get(b.id) ?? 0 }));
}

/** Promos with show=true, filtered to ones currently within their date
 *  window. A null start/end date is treated as "always active" — matching
 *  how the promo rows we've seen so far are actually filled in. */
function isPromoActive(p: Promo): boolean {
  if (!p.show) return false;
  const today = new Date().toISOString().slice(0, 10);
  if (p.start_date && p.start_date > today) return false;
  if (p.end_date && p.end_date < today) return false;
  return true;
}

export async function getBuilder(slug: string) {
  const supabase = createPreconClient();
  const { data: builder } = await supabase.from("builders").select("*").eq("slug", slug).maybeSingle();
  if (!builder) return null;
  const [{ data: projects }, { data: promoRows }] = await Promise.all([
    supabase.from("projects").select("*").eq("builder_id", builder.id),
    supabase.from("promos").select("*").eq("builder_id", builder.id).is("project_id", null),
  ]);
  const active = ((promoRows ?? []) as Promo[]).filter(isPromoActive);
  const promos = active.filter((p) => p.promo_type === "builder");
  const limitedTimePromo = active.find((p) => p.promo_type === "limited_time");
  return { builder: builder as Builder, projects: (projects ?? []) as Project[], promos, limitedTimePromo };
}

export async function getProjects(): Promise<(Project & { builder: Builder })[]> {
  const supabase = createPreconClient();
  const { data: projects } = await supabase.from("projects").select("*");
  const { data: builders } = await supabase.from("builders").select("*");
  const byId = new Map((builders ?? []).map((b) => [b.id, b as Builder]));
  return (projects ?? []).map((p) => ({ ...p, builder: byId.get(p.builder_id)! })).filter((p) => p.builder);
}

export async function getCities(): Promise<{ city: string; count: number }[]> {
  const supabase = createPreconClient();
  const { data } = await supabase.from("projects").select("city");
  const counts = new Map<string, number>();
  for (const r of data ?? []) { if (r.city) counts.set(r.city, (counts.get(r.city) ?? 0) + 1); }
  return [...counts.entries()].map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count);
}

export async function getProject(builderSlug: string, projectSlug: string) {
  const supabase = createPreconClient();
  const { data: builder } = await supabase.from("builders").select("*").eq("slug", builderSlug).maybeSingle();
  if (!builder) return null;
  const { data: project } = await supabase.from("projects").select("*").eq("builder_id", builder.id).eq("slug", projectSlug).maybeSingle();
  if (!project) return null;

  const [{ data: phases }, { data: models }, { data: projectPromos }, { data: builderPromos }, { data: projectAmenities }, gallery] = await Promise.all([
    supabase.from("phases").select("*").eq("project_id", project.id),
    supabase.from("home_models").select("*").eq("project_id", project.id),
    supabase.from("promos").select("*").eq("project_id", project.id).eq("promo_type", "limited_time"),
    supabase.from("promos").select("*").eq("builder_id", builder.id).is("project_id", null),
    supabase.from("project_amenities").select("amenity_id").eq("project_id", project.id),
    getImagesFor("project", project.id),
  ]);

  // Limited-time banner: a promo tied directly to this project, or — if none — a
  // builder-wide limited_time promo (matches the reference site's fallback).
  const activeProjectPromos = (projectPromos ?? []).filter(isPromoActive);
  const activeBuilderLimited = ((builderPromos ?? []) as Promo[]).filter((p) => p.promo_type === "limited_time").filter(isPromoActive);
  const limitedTimePromo = (activeProjectPromos[0] ?? activeBuilderLimited[0]) as Promo | undefined;

  // Small builder-wide incentive cards (same ones shown on the builder page).
  const promos = ((builderPromos ?? []) as Promo[]).filter((p) => p.promo_type === "builder").filter(isPromoActive);

  let amenities: Amenity[] = [];
  const amenityIds = (projectAmenities ?? []).map((a) => a.amenity_id);
  if (amenityIds.length) {
    const { data } = await supabase.from("amenities").select("*").in("id", amenityIds);
    amenities = (data ?? []) as Amenity[];
  }

  return {
    builder: builder as Builder, project: project as Project,
    phases: (phases ?? []) as Phase[], models: (models ?? []) as HomeModel[],
    promos, limitedTimePromo, amenities, gallery,
  };
}

export async function getModel(builderSlug: string, projectSlug: string, modelSlug: string) {
  const found = await getProject(builderSlug, projectSlug);
  if (!found) return null;
  const model = found.models.find((m) => m.slug === modelSlug);
  if (!model) return null;
  const siblings = found.models.filter((m) => m.slug !== modelSlug);

  const supabase = createPreconClient();
  let planQuery = supabase.from("payment_plans").select("*").eq("project_id", found.project.id).eq("show", true);
  if (model.home_type_id) planQuery = planQuery.eq("home_type_id", model.home_type_id);
  const [{ data: floorplans }, gallery, { data: paymentPlans }] = await Promise.all([
    supabase.from("floorplans").select("*").eq("model_id", model.id),
    getImagesFor("home_model", model.id),
    planQuery,
  ]);

  let installments: PaymentInstallment[] = [];
  if (paymentPlans?.length) {
    const { data } = await supabase.from("payment_installments").select("*").eq("payment_plan_id", paymentPlans[0].id).order("sort_order");
    installments = (data ?? []) as PaymentInstallment[];
  }

  return {
    builder: found.builder, project: found.project, model, siblings,
    floorplans: (floorplans ?? []) as Floorplan[], gallery, limitedTimePromo: found.limitedTimePromo,
    paymentPlan: paymentPlans?.[0] as PaymentPlan | undefined, installments,
  };
}
