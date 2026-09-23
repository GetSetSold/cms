import type { MetadataRoute } from "next";
import { getPublishedSlugs } from "@/lib/cms";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const pages = await getPublishedSlugs();
  return pages.map((p) => ({
    url: p.slug === "home" ? `${base}/` : `${base}/${p.slug}`,
    lastModified: p.updated_at,
    changeFrequency: "weekly",
    priority: p.slug === "home" ? 1 : 0.7,
  }));
}
