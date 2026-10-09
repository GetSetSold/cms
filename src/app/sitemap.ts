import type { MetadataRoute } from "next";
import { getPublishedSlugs } from "@/lib/cms";
import { citySlug, listNormalizedCities } from "@/lib/mls";
import { listNeighbourhoods } from "@/lib/neighbourhoods";
import { GUIDES } from "@/lib/guides/registry";
import { getPosts } from "@/lib/blog";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [pages, cities, hoods, posts] = await Promise.all([
    getPublishedSlugs(),
    listNormalizedCities(),
    listNeighbourhoods(),
    getPosts({ limit: 500 }),
  ]);

  const entries: MetadataRoute.Sitemap = pages.map((p) => ({
    url: p.slug === "home" ? `${base}/` : `${base}/${p.slug}`,
    lastModified: p.updated_at,
    changeFrequency: "weekly",
    priority: p.slug === "home" ? 1 : 0.7,
  }));

  // Calculators hub + detail pages
  entries.push({ url: `${base}/calculators`, changeFrequency: "weekly", priority: 0.9 });
  for (const slug of [
    "affordability-calculator",
    "mortgage-payment-calculator",
    "purchase-cost-calculator",
    "maximum-mortgage-calculator",
    "required-income-calculator",
    "mortgage-renewal-calculator",
    "compare-mortgage-rates",
    "land-transfer-tax-calculator-ontario",
    "closing-costs-calculator-canada",
    "ontario-hst-rebate-calculator",
    "down-payment-comparison-calculator",
    "buy-vs-rent-calculator",
    "net-proceeds-calculator",
    "rental-investment-forecast-calculator",
  ]) {
    entries.push({ url: `${base}/calculators/${slug}`, changeFrequency: "weekly", priority: 0.8 });
  }

  // Guides hub + detail pages
  entries.push({ url: `${base}/guides`, changeFrequency: "weekly", priority: 0.9 });
  for (const g of GUIDES) {
    entries.push({ url: `${base}/guides/${g.id}`, changeFrequency: "weekly", priority: 0.8 });
  }

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

  // Updates/blog posts
  entries.push({ url: `${base}/updates`, changeFrequency: "daily", priority: 0.8 });
  for (const post of posts) {
    entries.push({
      url: `${base}/updates/${post.category_slug}/${post.slug}`,
      lastModified: post.updated_at,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  // HPI market trends
  entries.push({ url: `${base}/ontario-housing-market-trends`, changeFrequency: "weekly", priority: 0.8 });
  // HPI city pages use the same city list
  for (const city of cities) {
    entries.push({
      url: `${base}/ontario-housing-market-trends/${citySlug(city)}`,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  return entries;
}
