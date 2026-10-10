import { getAnyOgImage, ogImageMeta } from "@/lib/ogImage";
import { seoTitle } from "@/lib/seo";
import { getSettings, getLogo } from "@/lib/cms";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { PropertyAlertsForm } from "@/components/property-alerts/PropertyAlertsForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const title = await seoTitle("Property Alerts - Get Notified of New Listings");
  const description = "Tell us what you're looking for and we'll email you when matching listings hit the market.";
  const ogImage = await getAnyOgImage();
  return { title, description, ...ogImageMeta(ogImage, title, description) };
}

export default async function PropertyAlertsPage() {
  const settings = await getSettings();
  const logo = await getLogo(settings);
  const themeVars_ = themeVars(settings);

  return (
    <div style={themeVars_} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      <SiteHeader settings={settings} logo={logo} />
      <main className="mx-auto w-full max-w-7xl px-5 py-10 md:px-10 md:py-14">
        <PropertyAlertsForm />
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
