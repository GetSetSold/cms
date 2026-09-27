import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSettings, getLogo } from "@/lib/cms";
import { getBuilder } from "@/lib/precon";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { LeadForm } from "@/components/blocks/LeadForm";

const wrap = "mx-auto w-full max-w-7xl px-5 md:px-10";
const card = "rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line shadow-[var(--shadow-card)] bg-white";

export async function generateMetadata({ params }: { params: Promise<{ builder: string }> }): Promise<Metadata> {
  const { builder } = await params;
  const found = await getBuilder(builder);
  if (!found) return {};
  return { title: `Pre-Construction Homes by ${found.builder.builder_name} | Ontario` };
}

export default async function BuilderPage({ params }: { params: Promise<{ builder: string }> }) {
  const { builder: slug } = await params;
  const [settings, found] = await Promise.all([getSettings(), getBuilder(slug)]);
  if (!found) notFound();
  const { builder, projects, promos } = found;
  const logo = await getLogo(settings);

  return (
    <div style={themeVars(settings)} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      <SiteHeader settings={settings} logo={logo} />

      <main>
        <div className={`${wrap} pb-4 pt-6 text-sm text-muted`}>
          <Link href="/pre-construction" prefetch={false}>Pre-Construction</Link> › {builder.builder_name}
        </div>

        {builder.banner_url ? (
          <div className={`${wrap} pb-6`}>
            <div className="aspect-[21/9] overflow-hidden rounded-[var(--radius-lg)] bg-soft">
              <img src={builder.banner_url} alt={builder.builder_name} className="h-full w-full object-cover" />
            </div>
          </div>
        ) : null}

        <section className={`${wrap} flex flex-col items-start gap-4 pb-10`}>
          {builder.logo_url ? <img src={builder.logo_url} alt={builder.builder_name} className="h-12 w-auto object-contain" /> : null}
          <h1 className="font-display text-2xl font-extrabold md:text-5xl">{builder.builder_name}</h1>
          <div className="flex gap-3 pt-2">
            <a href="#lead" className="flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-white md:h-13 md:px-7 md:text-base">Register Interest</a>
            <a href="#projects" className="flex h-11 items-center rounded-full border border-ink px-6 text-sm font-medium md:h-13 md:px-7 md:text-base">View Projects</a>
          </div>
        </section>

        {builder.description ? (
          <section className={`${wrap} pb-10`}>
            <div className={`${card} p-5 md:p-8`}>
              <h2 className="mb-2 text-lg font-bold md:text-2xl">About {builder.builder_name}</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted md:text-base">{builder.description}</p>
            </div>
          </section>
        ) : null}

        {promos.length ? (
          <section className={`${wrap} flex flex-col gap-3 pb-10`}>
            {promos.map((promo) => (
              <div key={promo.id} className="flex flex-col items-start gap-2 rounded-[var(--radius-lg)] bg-gradient-to-br from-ink to-primary p-5 text-white md:p-6">
                {promo.badge ? <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">{promo.badge}</span> : null}
                <h3 className="text-lg font-extrabold md:text-xl">{promo.title}</h3>
                {promo.description ? <p className="text-sm text-white/80">{promo.description}</p> : null}
              </div>
            ))}
          </section>
        ) : null}

        <section id="projects" className={`${wrap} flex flex-col gap-5 pb-14`}>
          <h2 className="text-xl font-extrabold md:text-3xl">Active Projects</h2>
          {projects.length ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <Link key={p.id} href={`/pre-construction/${slug}/${p.slug}`} prefetch={false} className={`flex flex-col overflow-hidden ${card}`}>
                  <div className="relative aspect-[4/3] bg-soft">
                    {p.main_image_url ? <img src={p.main_image_url} alt={p.project_name} className="h-full w-full object-cover" /> : null}
                    {p.project_status ? <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-white">{p.project_status}</span> : null}
                  </div>
                  <div className="flex flex-col gap-1 p-4">
                    <div className="text-base font-bold text-primary md:text-lg">{p.p_start_price ? `From $${Number(p.p_start_price).toLocaleString()}` : "Price TBA"}</div>
                    <div className="text-sm font-medium">{p.project_name}</div>
                    <div className="text-xs text-muted">{p.city}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : <p className="text-muted">No active projects at this time.</p>}
        </section>

        <section id="lead" className={`${wrap} grid gap-6 pb-16 md:grid-cols-2 md:gap-12`}>
          <div className="flex flex-col gap-3">
            <h2 className="text-xl font-extrabold md:text-3xl">Interested in a New Home?</h2>
            <p className="text-sm text-muted md:text-lg">Our team is ready to connect you with the right project, floor plan, and payment plan.</p>
          </div>
          <LeadForm data={{ form_key: "precon", heading: "", submit_label: "Get Info" }} siteName={settings.site_name} />
        </section>
      </main>

      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
