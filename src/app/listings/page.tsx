import type { Metadata } from "next";
import { getAnyOgImage, ogImageMeta } from "@/lib/ogImage";
import { seoTitle } from "@/lib/seo";
import { getSettings, getLogo } from "@/lib/cms";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { ListingsBrowser, DEFAULT_CITY, type ListingsSearchParams } from "@/components/listings/ListingsBrowser";
import { NlpSearchBox } from "@/components/listings/NlpSearchBox";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<ListingsSearchParams> }): Promise<Metadata> {
  const sp = await searchParams;
  const { city } = sp;
  const effective = city === "all" ? null : city || DEFAULT_CITY;
  const page = Math.max(1, Number(sp.page) || 1);
  const isRent = sp.type === "rent";
  const base = effective
    ? `${effective} MLS® Listings & Real Estate for ${isRent ? "Rent" : "Sale"}`
    : `MLS® Listings & Real Estate for ${isRent ? "Rent" : "Sale"}`;
  const title = await seoTitle(page > 1 ? `${base} (Page ${page})` : base);
  const description = effective ? `Browse MLS® listings for ${isRent ? "rent" : "sale"} in ${effective}.` : "Browse all MLS® listings.";
  const ogImage = await getAnyOgImage();
  return {
    title,
    description,
    alternates: { canonical: city ? `/listings?city=${encodeURIComponent(city)}` : "/listings" },
    ...ogImageMeta(ogImage, title, description),
  };
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
        <NlpSearchBox basePath="/listings" />
        <ListingsBrowser sp={sp} basePath="/listings" />
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
