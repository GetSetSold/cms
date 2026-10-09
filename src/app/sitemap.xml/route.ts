import { getPublishedSlugs } from "@/lib/cms";
import { citySlug, listNormalizedCities } from "@/lib/mls";
import { listNeighbourhoods } from "@/lib/neighbourhoods";
import { GUIDES } from "@/lib/guides/registry";
import { getPosts } from "@/lib/blog";

export const dynamic = "force-dynamic";

/** Escape XML entities in URLs and text. */
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export async function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [pages, cities, hoods, posts] = await Promise.all([
    getPublishedSlugs(),
    listNormalizedCities(),
    listNeighbourhoods(),
    getPosts({ limit: 500 }),
  ]);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  const addUrl = (loc: string, lastmod?: string, changefreq = "weekly", priority = 0.7) => {
    xml += `  <url><loc>${esc(loc)}</loc>`;
    if (lastmod) xml += `<lastmod>${esc(lastmod)}</lastmod>`;
    xml += `<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>\n`;
  };

  // CMS pages
  for (const p of pages) {
    const url = p.slug === "home" ? `${base}/` : `${base}/${p.slug}`;
    const lastmod = p.updated_at ? new Date(p.updated_at).toISOString().split("T")[0] : undefined;
    addUrl(url, lastmod, "weekly", p.slug === "home" ? 1 : 0.7);
  }

  // Calculators
  addUrl(`${base}/calculators`, undefined, "weekly", 0.9);
  for (const slug of [
    "affordability-calculator", "mortgage-payment-calculator", "purchase-cost-calculator",
    "maximum-mortgage-calculator", "required-income-calculator", "mortgage-renewal-calculator",
    "compare-mortgage-rates", "land-transfer-tax-calculator-ontario", "closing-costs-calculator-canada",
    "ontario-hst-rebate-calculator", "down-payment-comparison-calculator", "buy-vs-rent-calculator",
    "net-proceeds-calculator", "rental-investment-forecast-calculator",
  ]) {
    addUrl(`${base}/calculators/${slug}`, undefined, "weekly", 0.8);
  }

  // Guides
  addUrl(`${base}/guides`, undefined, "weekly", 0.9);
  for (const g of GUIDES) {
    addUrl(`${base}/guides/${g.id}`, undefined, "weekly", 0.8);
  }

  // Province + cities
  addUrl(`${base}/ontario-real-estate`, undefined, "daily", 0.9);
  for (const city of cities) {
    addUrl(`${base}/${citySlug(city)}-real-estate`, undefined, "daily", 0.8);
  }

  // Neighbourhoods
  for (const h of hoods) {
    addUrl(`${base}/${citySlug(h.city)}-real-estate/${h.hoodSlug}`, undefined, "daily", 0.7);
  }

  // Updates
  addUrl(`${base}/updates`, undefined, "daily", 0.8);
  for (const post of posts) {
    const catSlug = (post as any).blog_categories?.slug || "general";
    const lastmod = (post as any).updated_at ? new Date((post as any).updated_at).toISOString().split("T")[0] : undefined;
    addUrl(`${base}/updates/${catSlug}/${(post as any).slug}`, lastmod, "weekly", 0.6);
  }

  // HPI
  addUrl(`${base}/ontario-housing-market-trends`, undefined, "weekly", 0.8);
  for (const city of cities) {
    addUrl(`${base}/ontario-housing-market-trends/${citySlug(city)}`, undefined, "weekly", 0.6);
  }

  xml += `</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
}
