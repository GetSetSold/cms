import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSettings, getLogo } from "@/lib/cms";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { listCities, citySlug, createMlsClient } from "@/lib/mls";

export const dynamic = "force-dynamic";

const PROVINCES: Record<string, { name: string; url: string }> = {
  ontario: { name: "Ontario", url: "/ontario-real-estate" },
};

export async function generateMetadata({ params }: { params: Promise<{ province: string }> }): Promise<Metadata> {
  const { province } = await params;
  const info = PROVINCES[province];
  if (!info) return { title: "Not found" };
  return {
    title: `${info.name} Real Estate & MLS® Listings`,
    description: `Browse live MLS® listings across ${info.name}. Explore homes for sale and rent by city, with market stats for every market.`,
    alternates: { canonical: info.url },
  };
}

interface CityCount {
  city: string;
  slug: string;
  count: number;
}

/** All cities with active listings, sorted by inventory. Count queries are
 *  tiny HEAD requests; chunked to avoid hammering the API. */
async function getProvinceCities(): Promise<CityCount[]> {
  const mls = createMlsClient();
  const cities = await listCities();
  const results: CityCount[] = [];
  const CHUNK = 20;
  for (let i = 0; i < cities.length; i += CHUNK) {
    const chunk = cities.slice(i, i + CHUNK);
    const counts = await Promise.all(
      chunk.map(async (city) => {
        const { count } = await mls
          .from("grid")
          .select("ListingKey", { count: "exact", head: true })
          .eq("City", city);
        return { city, slug: citySlug(city), count: count ?? 0 };
      })
    );
    results.push(...counts);
  }
  return results.filter((r) => r.count > 0).sort((a, b) => b.count - a.count);
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
        <div className="mb-4 text-sm text-muted">
          <a href="/" className="hover:text-ink">Home</a> / {info.name} Real Estate
        </div>
        <h1 className="font-display text-3xl md:text-4xl">{info.name} Real Estate &amp; MLS® Listings</h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted">
          Browse {totalListings.toLocaleString()} active MLS® listings across {info.name}. Select a city
          below to see homes for sale and rent, live market stats, and local market FAQs.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((c) => (
            <a
              key={c.slug}
              href={`/${c.slug}-real-estate`}
              className="rounded-2xl bg-white p-6 transition hover:shadow-lg"
            >
              <div className="font-display text-xl">{c.city} Real Estate</div>
              <div className="mt-1 text-sm text-muted">{c.count.toLocaleString()} active listings</div>
            </a>
          ))}
        </div>
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
