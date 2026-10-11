import type { Metadata } from "next";
import Link from "next/link";
import { getSettings, getLogo } from "@/lib/cms";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
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
        <div className={`${wrap} py-10 md:py-14`}>
          <div className="mx-auto max-w-2xl rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line bg-white p-7 shadow-[var(--shadow-card)] md:p-10">
            <nav className="text-[13px] text-muted" aria-label="Breadcrumb">
              <Link href="/pre-construction" prefetch={false} className="hover:text-ink">Pre-Construction</Link>
              <span className="mx-1.5">›</span>
              <span>Pre-Con Alerts</span>
            </nav>
            <p className="pt-5 text-[11px] font-bold uppercase tracking-[0.25em] text-primary">Stay Ahead</p>
            <h1 className="pt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl">
              Pre-con updates, before everyone else.
            </h1>
            <p className="pt-3 text-[15px] leading-relaxed text-muted">
              Get an email when new pre-construction projects launch — with pricing, incentives, and floor plans.
            </p>
            <div className="pt-6">
              <PreconAlertsForm />
            </div>
          </div>
        </div>
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
