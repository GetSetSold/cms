import type { Metadata } from "next";
import Link from "next/link";
import { getSettings, getLogo } from "@/lib/cms";
import { seoTitle } from "@/lib/seo";
import { getBuilders } from "@/lib/precon";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { PreconBoxHeader } from "@/components/site/PreconBoxHeader";
import { PreconSectionHeader } from "@/components/site/PreconSectionHeader";

const wrap = "mx-auto w-full max-w-7xl px-5 md:px-10";
const card = "rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line shadow-[var(--shadow-card)] bg-white";

export async function generateMetadata(): Promise<Metadata> {
  const title = await seoTitle("Pre-Construction Builders in Ontario");
  const description = "Compare Ontario's top pre-construction builders — reputations, past projects, and current offerings.";
  const url = "https://www.getsetsold.ca/pre-construction/builders";
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, type: "website", url },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function BuildersPage() {
  const settings = await getSettings();
  const logo = await getLogo(settings);
  const builders = await getBuilders();
  const totalProjects = builders.reduce((n, b) => n + b.project_count, 0);

  return (
    <div style={themeVars(settings)} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      <SiteHeader settings={settings} logo={logo} />
      <main className="pb-16">
        <PreconBoxHeader
          crumbs={[{ label: "Pre-Construction", href: "/pre-construction" }, { label: "Builders" }]}
          eyebrow="Pre-Construction Ontario"
          title="Builders behind Ontario's new homes."
          lede="The builders bringing new communities to life across Ontario — browse their projects, floor plans, and VIP incentives."
          facts={[
            { value: String(builders.length), label: "Builders" },
            { value: String(totalProjects), label: "Projects" },
          ]}
        />

        <section className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
          <PreconSectionHeader eyebrow="Directory" heading="All Builders" />
          {builders.length ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {builders.map((b) => (
                <Link key={b.id} href={`/pre-construction/${b.slug}`} prefetch={false} className={`group flex flex-col items-center gap-2 p-7 text-center ${card}`}>
                  <span className="flex h-[72px] w-full items-center justify-center">
                    {b.logo_url ? (
                      <img src={b.logo_url} alt={b.builder_name} className="max-h-[64px] w-auto max-w-[200px] object-contain" />
                    ) : (
                      <span className="font-display text-xl font-extrabold tracking-tight">{b.builder_name}</span>
                    )}
                  </span>
                  <span className="font-display text-[17px] font-bold">{b.builder_name}</span>
                  <span className="mt-1 inline-flex items-center gap-2 rounded-[var(--radius-btn,999px)] bg-primary/10 px-4 py-1.5 text-[12.5px] font-bold text-primary">
                    {b.project_count} project{b.project_count === 1 ? "" : "s"}
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7M7 7h10v10" /></svg>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted">No builders listed yet.</p>
          )}
        </div>
</section>
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
