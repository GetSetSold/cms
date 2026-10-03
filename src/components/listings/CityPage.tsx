import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveCitySlug } from "@/lib/mls";
import { getCityStats } from "@/lib/cityStats";
import { getSettings, getLogo } from "@/lib/cms";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { ListingsBrowser, type ListingsSearchParams } from "@/components/listings/ListingsBrowser";
import { CityStatsSection } from "@/components/listings/CityStatsSection";
import { CityEditorial } from "@/components/listings/CityEditorial";
import { CityFaq } from "@/components/listings/CityFaq";

export async function cityPageMetadata(slug: string): Promise<Metadata> {
  const city = await resolveCitySlug(slug);
  if (!city) return { title: "City not found" };
  return {
    title: `Homes for sale in ${city}`,
    description: `Browse current listings for sale and rent in ${city}.`,
    alternates: { canonical: `/${slug}-real-estate` },
  };
}

export async function CityPageContent({
  slug, sp,
}: {
  slug: string;
  sp: ListingsSearchParams;
}) {
  const city = await resolveCitySlug(slug);
  if (!city) notFound();
  const [settings, stats] = await Promise.all([getSettings(), getCityStats(city)]);
  const logo = await getLogo(settings);

  const themeVars_ = themeVars(settings);

  return (
    <div style={themeVars_} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      <SiteHeader settings={settings} logo={logo} />
      <main className="mx-auto w-full max-w-7xl px-5 py-10 md:px-10 md:py-14">
        <ListingsBrowser sp={sp} basePath={`/${slug}-real-estate`} fixedCity={city} heading={`Homes for sale in ${city}`} />
        <CityStatsSection stats={stats} />
        <CityEditorial stats={stats} />
        <CityFaq stats={stats} />
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
