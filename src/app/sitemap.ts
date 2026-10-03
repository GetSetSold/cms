import type { MetadataRoute } from "next";
import { getPublishedSlugs } from "@/lib/cms";
import { citySlug, listNormalizedCities } from "@/lib/mls";
import { listNeighbourhoods } from "@/lib/neighbourhoods";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [pages, cities, hoods] = await Promise.all([
    getPublishedSlugs(),
    listNormalizedCities(),
    listNeighbourhoods(),
  ]);

  const entries: MetadataRoute.Sitemap = pages.map((p) => ({
    url: p.slug === "home" ? `${base}/` : `${base}/${p.slug}`,
    lastModified: p.updated_at,
    changeFrequency: "weekly",
    priority: p.slug === "home" ? 1 : 0.7,
  }));

  // Province hub
  entries.push({
    url: `${base}/ontario-real-estate`,
    changeFrequency: "daily",
    priority: 0.9,
  });

  // City hubs (normalized)
  for (const city of cities) {
    entries.push({
      url: `${base}/${citySlug(city)}-real-estate`,
      changeFrequency: "daily",
      priority: 0.8,
    });
  }

  // Neighbourhood pages
  for (const h of hoods) {
    entries.push({
      url: `${base}/${citySlug(h.city)}-real-estate/${h.hoodSlug}`,
      changeFrequency: "daily",
      priority: 0.7,
    });
  }

  return entries;
}
