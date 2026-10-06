import type { Metadata } from "next";
import { getAnyOgImage, ogImageMeta } from "@/lib/ogImage";
import { seoTitle } from "@/lib/seo";
import { notFound } from "next/navigation";
import { getSettings, getLogo } from "@/lib/cms";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { ProvinceCityExplorer } from "@/components/listings/ProvinceCityExplorer";
import { citySlug, createMlsClient, normalizeCity } from "@/lib/mls";

export const dynamic = "force-dynamic";

const PROVINCES: Record<string, { name: string; url: string }> = {
  ontario: { name: "Ontario", url: "/ontario-real-estate" },
};

export async function generateMetadata({ params }: { params: Promise<{ province: string }> }): Promise<Metadata> {
  const { province } = await params;
  const info = PROVINCES[province];
  if (!info) return { title: "Not found" };
  const title = await seoTitle(`${info.name} MLS® Listings & Real Estate for Sale`);
  const description = `Browse live MLS® listings for sale across ${info.name}. Explore homes by city, with market stats for every market.`;
  const ogImage = await getAnyOgImage();
  return {
    title,
    description,
    alternates: { canonical: info.url },
    ...ogImageMeta(ogImage, title, description),
  };
}

interface CityCount {
  city: string;
  slug: string;
  count: number;
}

/** Normalized cities with live listing counts. Single parallel scan of the
 *  grid City column (no N+1 count queries). Module-level cache (1h) because
 *  unstable_cache does not persist on Workers — each isolate keeps its own. */
let provinceCache: { data: CityCount[]; expires: number } | null = null;

async function getProvinceCities(): Promise<CityCount[]> {
  if (provinceCache && Date.now() < provinceCache.expires) return provinceCache.data;
  const mls = createMlsClient();
  const counts = new Map<string, number>();
  // Sequential pages: reliable on Workers.
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await mls.from("grid").select("City").range(from, from + PAGE - 1);
    if (error) throw new Error(`provinceCities: ${error.message}`);
    if (!data || !data.length) break;
    for (const r of data as { City: string | null }[]) {
      const n = normalizeCity(r.City || "");
      if (!n || n.toLowerCase() === "unknown") continue;
      counts.set(n, (counts.get(n) ?? 0) + 1);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  const result = [...counts.entries()]
    .map(([city, count]) => ({ city, slug: citySlug(city), count }))
    .sort((a, b) => b.count - a.count);
  provinceCache = { data: result, expires: Date.now() + 3600_000 };
  return result;
}

export default async function ProvincePage({ params }: { params: Promise<{ province: string }> }) {
  const { province } = await params;
  const info = PROVINCES[province];
  if (!info) notFound();

  const [settings, cities] = await Promise.all([getSettings(), getProvinceCities()]);
  const logo = await getLogo(settings);
  const themeVars_ = themeVars(settings);
  const totalListings = cities.reduce((sum, c) => sum + c.count, 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "/" },
      { "@type": "ListItem", position: 2, name: `${info.name} Real Estate`, item: info.url },
    ],
  };

  return (
    <div style={themeVars_} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      <SiteHeader settings={settings} logo={logo} />
      <main className="mx-auto w-full max-w-7xl px-5 py-10 md:px-10 md:py-14">
        <nav className="mb-4 text-sm text-muted" aria-label="Breadcrumb">
          <a href="/">Home</a> / {info.name} Real Estate
        </nav>
                <ProvinceCityExplorer cities={cities} totalListings={totalListings} />
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </div>
  );
}
