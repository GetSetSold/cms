import type { Metadata } from "next";
import Link from "next/link";
import { getSettings, getLogo } from "@/lib/cms";
import { getProjects, getBuilders, getCities } from "@/lib/precon";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { PreconBoxHeader } from "@/components/site/PreconBoxHeader";
import { PreconSectionHeader } from "@/components/site/PreconSectionHeader";
import { PreconCardCta } from "@/components/site/PreconCardCta";
import { getCashbackAmount, formatCashback } from "@/lib/cashback";

const wrap = "mx-auto w-full max-w-7xl px-5 md:px-10";
const card = "rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line shadow-[var(--shadow-card)] bg-white";

export const metadata: Metadata = {
  title: "Pre-Construction Homes in Ontario | GetSetSold",
  description: "VIP access to pre-construction projects across Ontario — floor plans, pricing, and builder incentives, straight from the source.",
};

export default async function PreConstructionHub() {
  const settings = await getSettings();
  const logo = await getLogo(settings);
  const [projects, builders, cities] = await Promise.all([getProjects(), getBuilders(), getCities()]);
  const featured = projects.slice(0, 6);
  const topBuilders = builders.slice(0, 4);

  return (
    <div style={themeVars(settings)} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      <SiteHeader settings={settings} logo={logo} />
      <main className="pb-16">
        <PreconBoxHeader
          crumbs={[{ label: "Pre-Construction" }]}
          eyebrow="Pre-Construction Ontario"
          title="New builds, before everyone else sees them."
          lede="VIP access to pre-construction projects across Ontario — floor plans, pricing, and builder incentives, straight from the source."
          facts={[
            { value: String(projects.length), label: "Projects" },
            { value: String(builders.length), label: "Builders" },
            { value: String(cities.length), label: "Cities" },
          ]}
          ctas={[
            { label: "Get Pre-Con Alerts", href: "/pre-con-alerts", variant: "primary" },
            { label: "Browse Projects", href: "/projects", variant: "ghost" },
          ]}
        />

        <section className={`${wrap} pt-14`}>
          <div className="mb-6 flex items-end justify-between gap-4">
            <PreconSectionHeader eyebrow="Featured" heading="Latest pre-con projects" />
            <Link href="/projects" prefetch={false} className="shrink-0 text-sm font-bold text-primary">View all projects →</Link>
          </div>
          {featured.length ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((p) => {
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
                        {p.beds ? <span className="rounded-full bg-soft px-3 py-1 text-[12.5px] font-semibold">{p.beds} bd</span> : null}
                        {p.baths ? <span className="rounded-full bg-soft px-3 py-1 text-[12.5px] font-semibold">{p.baths} ba</span> : null}
                        {p.sqft ? <span className="rounded-full bg-soft px-3 py-1 text-[12.5px] font-semibold">{p.sqft} sqft</span> : null}
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
        </section>

        <section className={`${wrap} pt-14`}>
          <div className="mb-6 flex items-end justify-between gap-4">
            <PreconSectionHeader eyebrow="Builders" heading="Build with the best" />
            <Link href="/builders" prefetch={false} className="shrink-0 text-sm font-bold text-primary">View all builders →</Link>
          </div>
          {topBuilders.length ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {topBuilders.map((b) => (
                <Link key={b.id} href={`/pre-construction/${b.slug}`} prefetch={false} className={`group flex flex-col items-center gap-2 p-6 text-center ${card}`}>
                  <span className="flex h-[54px] w-full items-center justify-center">
                    {b.logo_url ? (
                      <img src={b.logo_url} alt={b.builder_name} className="max-h-[48px] w-auto max-w-[150px] object-contain" />
                    ) : (
                      <span className="font-display text-lg font-extrabold tracking-tight">{b.builder_name}</span>
                    )}
                  </span>
                  <span className="text-[14.5px] font-bold">{b.builder_name}</span>
                  <span className="text-[12.5px] text-muted">{b.project_count} project{b.project_count === 1 ? "" : "s"}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted">No builders listed yet.</p>
          )}
        </section>

        <section className={`${wrap} pt-14`}>
          <div className="mb-6 flex items-end justify-between gap-4">
            <PreconSectionHeader eyebrow="Models" heading="Compare floor plans" />
            <Link href="/models" prefetch={false} className="shrink-0 text-sm font-bold text-primary">View all models →</Link>
          </div>
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <p className="max-w-xl text-[15px] leading-relaxed text-muted">
              Every model across every project — compare layouts, sizes, and starting prices side by side before you visit a sales centre.
            </p>
            <Link href="/models" prefetch={false} className="flex h-12 items-center rounded-[var(--radius-btn)] bg-ink px-8 text-[15px] font-bold text-white">
              Browse All Models
            </Link>
          </div>
        </section>

        <section className="px-5 pt-16 text-center md:px-10">
          <h2 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">Get VIP access before the public launch.</h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
            Join the pre-con alert list — floor plans, price lists, and builder incentives in your inbox first.
          </p>
          <Link href="/pre-con-alerts" prefetch={false} className="mt-6 inline-flex h-12 items-center rounded-[var(--radius-btn)] bg-ink px-9 text-[15px] font-bold text-white">
            Get Pre-Con Alerts
          </Link>
        </section>
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
