import type { Metadata } from "next";
import { getSettings, getLogo } from "@/lib/cms";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { ListingsBrowser, DEFAULT_CITY, type ListingsSearchParams } from "@/components/listings/ListingsBrowser";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<ListingsSearchParams> }): Promise<Metadata> {
  const { city } = await searchParams;
  const effective = city === "all" ? null : city || DEFAULT_CITY;
  const title = effective ? `Homes for sale in ${effective}` : "All listings";
  return { title, alternates: { canonical: city ? `/listings?city=${encodeURIComponent(city)}` : "/listings" } };
}

export default async function ListingsPage({ searchParams }: { searchParams: Promise<ListingsSearchParams> }) {
  const [sp, settings] = await Promise.all([searchParams, getSettings()]);
  const logo = await getLogo(settings);
  const themeVars_ = themeVars(settings);

  return (
    <div style={themeVars_} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      <SiteHeader settings={settings} logo={logo} />
      <main className="mx-auto w-full max-w-7xl px-5 py-10 md:px-10 md:py-14">
        <ListingsBrowser sp={sp} basePath="/listings" />
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
