import { requireStaff } from "@/lib/auth";
import { getPublishedSlugs } from "@/lib/cms";
import { listNormalizedCities } from "@/lib/mls";
import { listNeighbourhoods } from "@/lib/neighbourhoods";
import { GUIDES } from "@/lib/guides/registry";
import { getPosts } from "@/lib/blog";
import { createMlsClient } from "@/lib/mls";

export default async function SitemapDashboard() {
  await requireStaff(["admin"]);
  
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  
  const [pages, cities, hoods, posts] = await Promise.all([
    getPublishedSlugs(),
    listNormalizedCities(),
    listNeighbourhoods(),
    getPosts({ limit: 500 }),
  ]);
  
  // Count active listings (grid table contains active listings only)
  const mls = createMlsClient();
  const { count: listingCount } = await mls.from("grid").select("ListingKey", { count: "exact", head: true });
  
  const sections = [
    { name: "CMS Pages", count: pages.length, url: `${base}/sitemap.xml`, desc: "Auto from database" },
    { name: "Calculators", count: 15, url: `${base}/sitemap.xml`, desc: "Hub + 14 calculators" },
    { name: "Guides", count: GUIDES.length + 1, url: `${base}/sitemap.xml`, desc: "Hub + all guides" },
    { name: "City Hubs", count: cities.length + 1, url: `${base}/sitemap.xml`, desc: "Province + cities" },
    { name: "Neighbourhoods", count: hoods.length, url: `${base}/sitemap.xml`, desc: "1,318 pages" },
    { name: "Updates", count: posts.length + 1, url: `${base}/sitemap.xml`, desc: "Blog posts" },
    { name: "HPI Trends", count: cities.length + 1, url: `${base}/sitemap.xml`, desc: "Overview + city pages" },
    { name: "Listings", count: listingCount ?? 0, url: `${base}/sitemap-index.xml`, desc: "Sharded, 10k per file" },
  ];
  
  const total = sections.reduce((sum, s) => sum + s.count, 0);
  
  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Sitemap</h1>
      <p className="text-muted mb-6">Total URLs: <strong>{total.toLocaleString()}</strong></p>
      
      <div className="grid gap-4">
        {sections.map((s) => (
          <div key={s.name} className="rounded-lg border border-line p-4 flex items-center justify-between">
            <div>
              <div className="font-semibold">{s.name}</div>
              <div className="text-sm text-muted">{s.desc}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{s.count.toLocaleString()}</div>
              <div className="text-xs text-muted">URLs</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 rounded-lg border border-line p-4">
        <div className="font-semibold mb-2">Sitemap URLs</div>
        <div className="flex flex-col gap-2 text-sm">
          <a href="/sitemap.xml" target="_blank" className="text-primary hover:underline">/sitemap.xml</a>
          <a href="/sitemap-index.xml" target="_blank" className="text-primary hover:underline">/sitemap-index.xml</a>
          <a href="/robots.txt" target="_blank" className="text-primary hover:underline">/robots.txt</a>
        </div>
      </div>
    </div>
  );
}
