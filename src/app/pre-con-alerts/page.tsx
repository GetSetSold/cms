import type { Metadata } from "next";
import { getSettings, getLogo } from "@/lib/cms";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { PreconBoxHeader } from "@/components/site/PreconBoxHeader";
import { PreconAlertsForm } from "@/components/site/PreconAlertsForm";

const wrap = "mx-auto w-full max-w-7xl px-5 md:px-10";

export const metadata: Metadata = {
  title: "Pre-Con Alerts | GetSetSold",
  description: "Get an email when new pre-construction projects launch — with pricing, incentives, and floor plans.",
};

export default async function PreconAlertsPage() {
  const settings = await getSettings();
  const logo = await getLogo(settings);

  return (
    <div style={themeVars(settings)} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      <SiteHeader settings={settings} logo={logo} />
      <main className="pb-16">
        <PreconBoxHeader
          crumbs={[{ label: "Pre-Construction", href: "/pre-construction" }, { label: "Pre-Con Alerts" }]}
          eyebrow="Stay Ahead"
          title="Pre-con updates, before everyone else."
          lede="Get an email when new pre-construction projects launch — with pricing, incentives, and floor plans."
        />
        <section className="border-t border-line">
          <div className={`${wrap} py-[50px]`}>
            <div className="mx-auto max-w-xl">
              <PreconAlertsForm />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
