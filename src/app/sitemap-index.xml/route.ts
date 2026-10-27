import { createMlsClient, listingSlug } from "@/lib/mls";

export const dynamic = "force-dynamic";

// Edge cache (see sitemap-listings/[shard]/route.ts): the shard count query
// is cheap, but there is no reason to re-run it on every crawler hit.
const CACHE_HEADERS = {
  "Content-Type": "application/xml",
  "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
};

const PER_PAGE = 10000; // URLs per sitemap shard (max 50k per spec, we use 10k for safety)

/** Sitemap index listing all sitemaps. */
export async function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // Count listings to determine shard count (grid = active listings).
  // Estimated, not exact: COUNT(*) over the full DDF grid times out in the
  // Worker. Falls back to just the main sitemap if the count fails.
  let totalShards = 0;
  try {
    const mls = createMlsClient();
    const { count } = await mls.from("grid").select("ListingKey", { count: "estimated", head: true });
    totalShards = Math.ceil((count ?? 0) / PER_PAGE);
  } catch {
    totalShards = 0;
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  xml += `  <sitemap><loc>${base}/sitemap.xml</loc></sitemap>\n`;
  for (let i = 1; i <= totalShards; i++) {
    xml += `  <sitemap><loc>${base}/sitemap-listings/${i}</loc></sitemap>\n`;
  }
  xml += `</sitemapindex>`;

  return new Response(xml, {
    headers: CACHE_HEADERS,
  });
}
