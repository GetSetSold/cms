import { createMlsClient, listingSlug } from "@/lib/mls";

export const dynamic = "force-dynamic";

const PER_PAGE = 10000;

/** Sharded listings sitemap: /sitemap-listings-1.xml, /sitemap-listings-2.xml, etc. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ shard: string }> }
) {
  const { shard } = await params;
  const shardNum = parseInt(shard, 10);
  if (isNaN(shardNum) || shardNum < 1) {
    return new Response("Invalid shard", { status: 400 });
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const mls = createMlsClient();
  
  const from = (shardNum - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;
  
  const { data } = await mls
    .from("grid")
    .select("UnparsedAddress, City, ListingId, OriginalEntryTimestamp")
    .eq("Status", "Active")
    .order("OriginalEntryTimestamp", { ascending: false })
    .range(from, to);
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  for (const l of data ?? []) {
    const slug = listingSlug(l as any);
    const url = `${base}/listing/${slug}`;
    const lastmod = (l as any).OriginalEntryTimestamp 
      ? new Date((l as any).OriginalEntryTimestamp).toISOString().split("T")[0]
      : undefined;
    xml += `  <url><loc>${url}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<changefreq>daily</changefreq><priority>0.6</priority></url>\n`;
  }
  xml += `</urlset>`;
  
  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
