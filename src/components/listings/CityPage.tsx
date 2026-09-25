import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveCitySlug } from "@/lib/mls";
import { getSettings, getLogo } from "@/lib/cms";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { ListingsBrowser, type ListingsSearchParams } from "@/components/listings/ListingsBrowser";

export async function cityPageMetadata(slug: string, basePath: string): Promise<Metadata> {
  const city = await resolveCitySlug(slug);
  if (!city) return { title: "City not found" };
  return {
    title: `Homes for sale in ${city}`,
    description: `Browse current listings for sale and rent in ${city}.`,
    alternates: { canonical: `${basePath}/${slug}` },
  };
}

export async function CityPageContent({
  slug, basePath, sp,
}: {
  slug: string;
  basePath: string; // e.g. "/city" or "/listings/city" — this page's own route prefix
  sp: ListingsSearchParams;
}) {
  const [city, settings] = await Promise.all([resolveCitySlug(slug), getSettings()]);
  if (!city) notFound();
  const logo = await getLogo(settings);

  const themeVars_ = themeVars(settings);

  return (
    <div style={themeVars_} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      <SiteHeader settings={settings} logo={logo} />
      <main className="mx-auto w-full max-w-7xl px-5 py-10 md:px-10 md:py-14">
        <ListingsBrowser sp={sp} basePath={`${basePath}/${slug}`} fixedCity={city} heading={`Homes for sale in ${city}`} />
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
