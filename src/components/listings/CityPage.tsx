import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { resolveCitySlug, findRawCityBySlug, normalizeCity, citySlug } from "@/lib/mls";
import { getCityOgImage, ogImageMeta } from "@/lib/ogImage";
import { getCityStats } from "@/lib/cityStats";
import { getHoodsForCity } from "@/lib/neighbourhoods";
import { getSettings, getLogo } from "@/lib/cms";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { CardArrowButton } from "@/components/site/CardArrowButton";
import { ListingsBrowser, type ListingsSearchParams } from "@/components/listings/ListingsBrowser";
import { CityStatsSection } from "@/components/listings/CityStatsSection";
import { CityEditorial } from "@/components/listings/CityEditorial";
import { CityFaq } from "@/components/listings/CityFaq";

export async function cityPageMetadata(slug: string): Promise<Metadata> {
  const city = await resolveCitySlug(slug);
  if (!city) return { title: "City not found" };
  const title = `Homes for sale in ${city}`;
  const description = `Browse current listings for sale and rent in ${city}.`;
  const ogImage = await getCityOgImage(city);
  return {
    title,
    description,
    alternates: { canonical: `/${citySlug(city)}-real-estate` },
    ...ogImageMeta(ogImage, title, description),
  };
}

export async function CityPageContent({
  slug, sp,
}: {
  slug: string;
  sp: ListingsSearchParams;
}) {
  let city = await resolveCitySlug(slug);
  if (!city) {
    // Old parenthetical URL (e.g. /toronto-(mimico)-real-estate)? 301 to the
    // normalized hub.
    const raw = await findRawCityBySlug(slug);
    if (raw) permanentRedirect(`/${citySlug(normalizeCity(raw))}-real-estate`);
    notFound();
  }
  const cityUrl = `/${citySlug(city)}-real-estate`;
  // Normalize the URL: /Toronto-real-estate -> /toronto-real-estate etc.
  if (slug !== citySlug(city)) permanentRedirect(cityUrl);

  const [settings, stats, hoods] = await Promise.all([
    getSettings(),
    getCityStats(city),
    getHoodsForCity(city),
  ]);
  const logo = await getLogo(settings);

  const themeVars_ = themeVars(settings);

  return (
    <div style={themeVars_} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      <SiteHeader settings={settings} logo={logo} />
      <main className="mx-auto w-full max-w-7xl px-5 py-10 md:px-10 md:py-14">
        <ListingsBrowser sp={sp} basePath={cityUrl} fixedCity={city} heading={`Homes for sale in ${city}`} />
        <CityStatsSection stats={stats} />
        {hoods.length > 0 ? (
          <section className="mt-12">
            <h2 className="mb-5 font-display text-2xl">Neighbourhoods in {city}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {hoods.map((h) => (
                <a
                  key={h.hoodSlug}
                  href={`${cityUrl}/${h.hoodSlug}`}
                  className="group relative rounded-2xl bg-white p-6 pr-16 transition hover:shadow-lg"
                >
                  <div className="font-display text-xl">{h.hood}</div>
                  <div className="mt-1 text-sm text-muted">{h.count.toLocaleString()} active listings</div>
                  <CardArrowButton />
                </a>
              ))}
            </div>
          </section>
        ) : null}
        <CityEditorial stats={stats} />
        <CityFaq stats={stats} />
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
