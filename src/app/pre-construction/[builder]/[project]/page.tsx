import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSettings, getLogo } from "@/lib/cms";
import { getProject } from "@/lib/precon";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { PointsMap } from "@/components/site/PointsMap";
import { ModelsTabs } from "@/components/site/ModelsTabs";
import { LeadForm } from "@/components/blocks/LeadForm";

const wrap = "mx-auto w-full max-w-7xl px-5 md:px-10";
const card = "rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line shadow-[var(--shadow-card)] bg-white";

export async function generateMetadata({ params }: { params: Promise<{ builder: string; project: string }> }): Promise<Metadata> {
  const { builder, project } = await params;
  const found = await getProject(builder, project);
  if (!found) return {};
  return { title: `${found.project.name} | Pre-Construction in ${found.project.city ?? "Ontario"}`, description: found.project.description ?? undefined };
}

function Stat({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-lg font-bold md:text-2xl">{value ?? "—"}</span>
      <span className="text-[11px] text-muted md:text-xs">{label}</span>
    </div>
  );
}

export default async function ProjectPage({ params }: { params: Promise<{ builder: string; project: string }> }) {
  const { builder: builderSlug, project: projectSlug } = await params;
  const [settings, found] = await Promise.all([getSettings(), getProject(builderSlug, projectSlug)]);
  if (!found) notFound();
  const { builder, project, models } = found;
  const logo = await getLogo(settings);
  const bedsRange = project.beds_min && project.beds_max ? (project.beds_min === project.beds_max ? `${project.beds_min}` : `${project.beds_min}-${project.beds_max}`) : null;
  const bathsRange = project.baths_min && project.baths_max ? (project.baths_min === project.baths_max ? `${project.baths_min}` : `${project.baths_min}-${project.baths_max}`) : null;
  const sqftRange = project.sqft_min && project.sqft_max ? `${project.sqft_min.toLocaleString()}-${project.sqft_max.toLocaleString()}` : null;
  const basePath = `/pre-construction/${builderSlug}/${projectSlug}`;

  return (
    <div style={themeVars(settings)} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      <SiteHeader settings={settings} logo={logo} />

      <main>
        <div className={`${wrap} pb-4 pt-6 text-sm text-muted`}>
          <Link href="/pre-construction" prefetch={false}>Pre-Construction</Link> › <Link href={`/pre-construction/${builderSlug}`} prefetch={false}>{builder.name}</Link> › {project.name}
        </div>

        <section className={`${wrap} flex flex-col items-start gap-4 pb-8`}>
          {builder.logo_url ? <img src={builder.logo_url} alt={builder.name} className="h-10 w-auto object-contain" /> : null}
          <h1 className="font-display text-2xl font-extrabold md:text-5xl">{project.name}</h1>
          {project.cashback_amount ? (
            <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary md:text-sm">
              Up to ${project.cashback_amount.toLocaleString()} Cashback — Exclusive Buyer Perk
            </span>
          ) : null}
          <div className="flex gap-3 pt-1">
            <a href="#lead" className="flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-white md:h-13 md:px-7">Register Now</a>
            <a href="#models" className="flex h-11 items-center rounded-full border border-ink px-6 text-sm font-medium md:h-13 md:px-7">View Models</a>
          </div>
        </section>

        <section className={`${wrap} pb-10`}>
          <div className={`grid grid-cols-3 gap-4 p-5 sm:grid-cols-4 md:grid-cols-7 md:p-8 ${card}`}>
            <Stat label="City" value={project.city} />
            <Stat label="Status" value={project.status} />
            <Stat label="From" value={project.price_from ? `$${project.price_from.toLocaleString()}` : "TBA"} />
            <Stat label="Beds" value={bedsRange} />
            <Stat label="Baths" value={bathsRange} />
            <Stat label="Sq Ft" value={sqftRange} />
            <Stat label="VIP Release" value={project.vip_release_date ? new Date(project.vip_release_date).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : null} />
          </div>
        </section>

        {project.description ? (
          <section className={`${wrap} pb-10`}>
            <p className="max-w-3xl text-sm leading-relaxed text-muted md:text-base">{project.description}</p>
          </section>
        ) : null}

        {project.gallery.length ? (
          <section className={`${wrap} flex flex-col gap-5 pb-14`}>
            <h2 className="text-xl font-extrabold md:text-3xl">Image Gallery</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {project.gallery.map((src, i) => (
                <div key={i} className="aspect-[4/3] overflow-hidden rounded-[var(--radius-md)] bg-soft">
                  <img src={src} alt={`${project.name} photo ${i + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {(project.latitude && project.longitude) ? (
          <section className={`${wrap} flex flex-col gap-5 pb-14`}>
            <h2 className="text-xl font-extrabold md:text-3xl">Location</h2>
            {project.address ? <p className="text-sm text-muted">{project.address}</p> : null}
            <div className="h-72 md:h-96"><PointsMap points={[{ lat: project.latitude, lng: project.longitude, label: project.name, href: "#" }]} /></div>
          </section>
        ) : null}

        <section id="models" className={`${wrap} flex flex-col gap-5 pb-14`}>
          <h2 className="text-xl font-extrabold md:text-3xl">Models &amp; Floor Plans</h2>
          <ModelsTabs models={models} basePath={basePath} />
        </section>

        {project.amenities.length ? (
          <section className={`${wrap} flex flex-col gap-4 pb-14`}>
            <h2 className="text-xl font-extrabold md:text-3xl">Amenities &amp; Inclusions</h2>
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
              {project.amenities.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-primary"><path d="M20 6 9 17l-5-5" /></svg>
                  {a}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section id="lead" className={`${wrap} grid gap-6 pb-16 md:grid-cols-2 md:gap-12`}>
          <div className="flex flex-col gap-3">
            <h2 className="text-xl font-extrabold md:text-3xl">Interested in This Project?</h2>
            <p className="text-sm text-muted md:text-lg">From available lots to floor plans, upgrade options, and payment plans — we'll walk you through it all.</p>
          </div>
          <LeadForm data={{ form_key: "precon", heading: "", submit_label: "Get Info" }} siteName={settings.site_name} />
        </section>
      </main>

      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
