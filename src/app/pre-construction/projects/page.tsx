import type { Metadata } from "next";
import Link from "next/link";
import { getSettings, getLogo } from "@/lib/cms";
import { seoTitle } from "@/lib/seo";
import { getProjects, getCities } from "@/lib/precon";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { PreconBoxHeader } from "@/components/site/PreconBoxHeader";
import { PreconSectionHeader } from "@/components/site/PreconSectionHeader";
import { PreconCardCta } from "@/components/site/PreconCardCta";
import { getCashbackAmount, formatCashback } from "@/lib/cashback";

const wrap = "mx-auto w-full max-w-7xl px-5 md:px-10";
const card = "rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line shadow-[var(--shadow-card)] bg-white";

export async function generateMetadata(): Promise<Metadata> {
  const title = await seoTitle("Pre-Construction Projects in Ontario");
  const description = "Browse every pre-construction project across Ontario — pricing, availability, and VIP incentives.";
  const url = "https://www.getsetsold.ca/pre-construction/projects";
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, type: "website", url },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ProjectsPage() {
  const settings = await getSettings();
  const logo = await getLogo(settings);
  const [projects, cities] = await Promise.all([getProjects(), getCities()]);

  return (
    <div style={themeVars(settings)} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      <SiteHeader settings={settings} logo={logo} />
      <main className="pb-16">
        <PreconBoxHeader
          crumbs={[{ label: "Pre-Construction", href: "/pre-construction" }, { label: "Projects" }]}
          eyebrow="Pre-Construction Ontario"
          title="Every new project, in one place."
          lede="Browse all pre-construction projects across Ontario — towns, detached, and condos with VIP pricing and builder incentives."
          facts={[
            { value: String(projects.length), label: "Projects" },
            { value: String(cities.length), label: "Cities" },
          ]}
        />

        <section className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
          <PreconSectionHeader eyebrow="Catalogue" heading="All Projects" />
          {projects.length ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => {
                const cb = getCashbackAmount(p.p_start_price, settings.precon_cashback);
                return (
                  <Link key={p.id} href={`/pre-construction/${p.builder.slug}/${p.slug}`} prefetch={false} className={`group flex flex-col overflow-hidden ${card}`}>
                    <div className="relative aspect-[4/3] bg-soft">
                      {p.main_image_url ? <img src={p.main_image_url} alt={p.project_name} className="h-full w-full object-cover" /> : null}
                      {p.project_status ? <span className="absolute left-3 top-3 rounded-[var(--radius-label)] bg-black/75 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">{p.project_status}</span> : null}
                      {p.vip_release === "Yes" ? <span className="absolute right-3 top-3 rounded-[var(--radius-label)] bg-amber-500 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">VIP Release</span> : null}
                      {cb ? <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-[var(--radius-label)] bg-gradient-to-r from-[#065f46] to-[#059669] px-2.5 py-1 text-[11px] font-semibold text-white">{formatCashback(cb)} cashback</span> : null}
                    </div>
                    <div className="flex flex-col gap-1.5 p-5">
                      <div className="font-display text-xl font-extrabold">
                        {p.p_start_price ? `$${Number(p.p_start_price).toLocaleString()}` : "Price TBA"} <span className="text-[12.5px] font-medium text-muted">starting from</span>
                      </div>
                      <div className="text-[16.5px] font-bold">{p.project_name}</div>
                      <div className="text-[13.5px] text-muted">{p.builder.builder_name}{p.city ? ` · ${p.city}` : ""}</div>
                      <div className="flex flex-wrap gap-2 pt-1.5">
                        {p.beds ? <span className="rounded-[var(--radius-btn,999px)] bg-soft px-3 py-1 text-[12.5px] font-semibold">{p.beds} bd</span> : null}
                        {p.baths ? <span className="rounded-[var(--radius-btn,999px)] bg-soft px-3 py-1 text-[12.5px] font-semibold">{p.baths} ba</span> : null}
                        {p.sqft ? <span className="rounded-[var(--radius-btn,999px)] bg-soft px-3 py-1 text-[12.5px] font-semibold">{p.sqft} sqft</span> : null}
                      </div>
                      <PreconCardCta label="View Project" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-muted">No projects listed yet.</p>
          )}
        </div>
</section>
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
