import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createMlsClient } from "@/lib/mls";
import { getSettings } from "@/lib/cms";
import { themeFontHref, themeVars } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { ListingsBrowser, type ListingsSearchParams } from "@/components/listings/ListingsBrowser";

export const dynamic = "force-dynamic";

const slugify = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "-");

/** DDF City values are free text, not a fixed list — resolve the URL slug back
 *  to the exact-cased city string the database actually stores, once. */
async function resolveCity(slug: string) {
  const mls = createMlsClient();
  const { data } = await mls.from("grid").select("City").not("City", "is", null).limit(2000);
  const cities = [...new Set((data ?? []).map((r) => r.City as string))];
  return cities.find((c) => slugify(c) === slug) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const city = await resolveCity(slug);
  if (!city) return { title: "City not found" };
  return {
    title: `Homes for sale in ${city}`,
    description: `Browse current listings for sale and rent in ${city}.`,
    alternates: { canonical: `/city/${slug}` },
  };
}

export default async function CityPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<ListingsSearchParams> }) {
  const [{ slug }, sp, settings] = await Promise.all([params, searchParams, getSettings()]);
  const city = await resolveCity(slug);
  if (!city) notFound();

  const themeVars_ = themeVars(settings);

  return (
    <div style={themeVars_} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      <SiteHeader settings={settings} />
      <main className="mx-auto w-full max-w-7xl px-5 py-10 md:px-10 md:py-14">
        <ListingsBrowser sp={sp} basePath={`/city/${slug}`} fixedCity={city} heading={`Homes for sale in ${city}`} />
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
