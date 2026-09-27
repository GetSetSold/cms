import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSettings, getLogo } from "@/lib/cms";
import { getBuilder } from "@/lib/precon";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { PointsMap } from "@/components/site/PointsMap";
import { LeadForm } from "@/components/blocks/LeadForm";

const wrap = "mx-auto w-full max-w-7xl px-5 md:px-10";
const card = "rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line shadow-[var(--shadow-card)] bg-white";
const STATUS_TONE: Record<string, string> = { "Selling Now": "bg-[#1B8A5A]", "Coming Soon": "bg-primary", "Sold Out": "bg-ink" };

export async function generateMetadata({ params }: { params: Promise<{ builder: string }> }): Promise<Metadata> {
  const { builder } = await params;
  const found = await getBuilder(builder);
  if (!found) return {};
  return { title: `Pre-Construction Homes by ${found.builder.name} | Ontario`, description: found.builder.tagline ?? undefined };
}

export default async function BuilderPage({ params }: { params: Promise<{ builder: string }> }) {
  const { builder: slug } = await params;
  const [settings, found] = await Promise.all([getSettings(), getBuilder(slug)]);
  if (!found) notFound();
  const { builder, projects } = found;
  const logo = await getLogo(settings);
  const points = projects.filter((p) => p.latitude && p.longitude).map((p) => ({ lat: p.latitude!, lng: p.longitude!, label: p.name, href: `/pre-construction/${slug}/${p.slug}` }));

  return (
    <div style={themeVars(settings)} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      <SiteHeader settings={settings} logo={logo} />

      <main>
        <div className={`${wrap} pb-4 pt-6 text-sm text-muted`}>
          <Link href="/pre-construction" prefetch={false}>Pre-Construction</Link> › {builder.name}
        </div>

        <section className={`${wrap} flex flex-col items-start gap-4 pb-10`}>
          {builder.logo_url ? <img src={builder.logo_url} alt={builder.name} className="h-14 w-auto object-contain" /> : null}
          <h1 className="font-display text-2xl font-extrabold md:text-5xl">{builder.name}</h1>
          {builder.tagline ? <p className="max-w-xl text-sm text-muted md:text-lg">{builder.tagline}</p> : null}
          <div className="flex gap-3 pt-2">
            <a href="#lead" className="flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-white md:h-13 md:px-7 md:text-base">Register Interest</a>
            <a href="#projects" className="flex h-11 items-center rounded-full border border-ink px-6 text-sm font-medium md:h-13 md:px-7 md:text-base">View Projects</a>
          </div>
        </section>

        {builder.description ? (
          <section className={`${wrap} pb-10`}>
            <div className={`${card} p-5 md:p-8`}>
              <h2 className="mb-2 text-lg font-bold md:text-2xl">About {builder.name}</h2>
              <p className="text-sm leading-relaxed text-muted md:text-base">{builder.description}</p>
            </div>
          </section>
        ) : null}

        {builder.incentive_title ? (
          <section className={`${wrap} pb-10`}>
            <div className="flex flex-col items-start gap-3 rounded-[var(--radius-lg)] bg-gradient-to-br from-ink to-primary p-5 text-white md:p-8">
              <span className="text-xs font-bold uppercase tracking-wide text-white/70">Limited Time Offer</span>
              <h2 className="text-xl font-extrabold md:text-3xl">{builder.incentive_title}</h2>
              {builder.incentive_description ? <p className="text-sm text-white/80 md:text-base">{builder.incentive_description}</p> : null}
              <a href="#lead" className="mt-1 flex h-11 items-center rounded-full bg-white px-6 text-sm font-medium text-ink">Claim This Offer</a>
            </div>
          </section>
        ) : null}

        <section id="projects" className={`${wrap} flex flex-col gap-5 pb-14`}>
          <h2 className="text-xl font-extrabold md:text-3xl">Active Projects</h2>
          {projects.length ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <Link key={p.id} href={`/pre-construction/${slug}/${p.slug}`} prefetch={false} className={`flex flex-col overflow-hidden ${card}`}>
                  <div className="relative aspect-[4/3] bg-soft">
                    {p.gallery[0] ? <img src={p.gallery[0]} alt={p.name} className="h-full w-full object-cover" /> : null}
                    <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white ${STATUS_TONE[p.status]}`}>{p.status}</span>
                  </div>
                  <div className="flex flex-col gap-1 p-4">
                    <div className="text-base font-bold text-primary md:text-lg">{p.price_from ? `From $${p.price_from.toLocaleString()}` : "Price TBA"}</div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-muted">{p.city}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : <p className="text-muted">No active projects at this time.</p>}
        </section>

        {points.length ? (
          <section className={`${wrap} flex flex-col gap-5 pb-14`}>
            <h2 className="text-xl font-extrabold md:text-3xl">Building Across Ontario</h2>
            <div className="h-80 md:h-[420px]"><PointsMap points={points} /></div>
          </section>
        ) : null}

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
