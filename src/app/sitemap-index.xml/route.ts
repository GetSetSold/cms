import { createMlsClient, listingSlug } from "@/lib/mls";

export const dynamic = "force-dynamic";

const PER_PAGE = 10000; // URLs per sitemap shard (max 50k per spec, we use 10k for safety)

/** Sitemap index listing all sitemaps. */
export async function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  
  // Count listings to determine shard count (grid = active listings)
  const mls = createMlsClient();
  const { count } = await mls.from("grid").select("ListingKey", { count: "exact", head: true });
  const totalShards = Math.ceil((count ?? 0) / PER_PAGE);
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  xml += `  <sitemap><loc>${base}/sitemap.xml</loc></sitemap>\n`;
  for (let i = 1; i <= totalShards; i++) {
    xml += `  <sitemap><loc>${base}/sitemap-listings/${i}</loc></sitemap>\n`;
  }
  xml += `</sitemapindex>`;
  
  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
