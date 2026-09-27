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
  return { title: `${found.project.project_name} | Pre-Construction in ${found.project.city ?? "Ontario"}` };
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
  const { builder, project, models, promos, amenities, gallery } = found;
  const logo = await getLogo(settings);
  const basePath = `/pre-construction/${builderSlug}/${projectSlug}`;

  return (
    <div style={themeVars(settings)} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      <SiteHeader settings={settings} logo={logo} />

      <main>
        <div className={`${wrap} pb-4 pt-6 text-sm text-muted`}>
          <Link href="/pre-construction" prefetch={false}>Pre-Construction</Link> › <Link href={`/pre-construction/${builderSlug}`} prefetch={false}>{builder.builder_name}</Link> › {project.project_name}
        </div>

        <section className={`${wrap} flex flex-col items-start gap-4 pb-8`}>
          {builder.logo_url ? <img src={builder.logo_url} alt={builder.builder_name} className="h-10 w-auto object-contain" /> : null}
          <h1 className="font-display text-2xl font-extrabold md:text-5xl">{project.project_name}</h1>
          {promos[0]?.badge ? (
            <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary md:text-sm">{promos[0].badge} — {promos[0].title}</span>
          ) : null}
          <div className="flex gap-3 pt-1">
            <a href="#lead" className="flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-white md:h-13 md:px-7">Register Now</a>
            <a href="#models" className="flex h-11 items-center rounded-full border border-ink px-6 text-sm font-medium md:h-13 md:px-7">View Models</a>
          </div>
        </section>

        <section className={`${wrap} pb-10`}>
          <div className={`grid grid-cols-3 gap-4 p-5 sm:grid-cols-4 md:grid-cols-7 md:p-8 ${card}`}>
            <Stat label="City" value={project.city} />
            <Stat label="Status" value={project.project_status} />
            <Stat label="From" value={project.p_start_price ? `$${Number(project.p_start_price).toLocaleString()}` : "TBA"} />
            <Stat label="Beds" value={project.beds} />
            <Stat label="Baths" value={project.baths} />
            <Stat label="Sq Ft" value={project.sqft} />
            <Stat label="VIP Release" value={project.vip_release} />
          </div>
        </section>

        {(project.project_message || project.project_description) ? (
          <section className={`${wrap} flex flex-col gap-3 pb-10`}>
            {project.project_message ? <p className="max-w-3xl text-sm leading-relaxed md:text-base">{project.project_message}</p> : null}
            {project.project_description ? <p className="max-w-3xl text-sm leading-relaxed text-muted md:text-base">{project.project_description}</p> : null}
          </section>
        ) : null}

        {promos.length ? (
          <section className={`${wrap} flex flex-col gap-3 pb-10`}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {promos.map((promo) => (
                <div key={promo.id} className={`flex flex-col gap-1 p-4 ${card}`}>
                  {promo.badge ? <span className="w-fit rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">{promo.badge}</span> : null}
                  <strong className="text-sm">{promo.title}</strong>
                  {promo.description ? <span className="text-xs text-muted">{promo.description}</span> : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {(gallery.length || project.main_image_url) ? (
          <section className={`${wrap} flex flex-col gap-5 pb-14`}>
            <h2 className="text-xl font-extrabold md:text-3xl">Image Gallery</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {(gallery.length ? gallery.map((g) => g.image_url) : [project.main_image_url]).map((src, i) => (
                <div key={i} className="aspect-[4/3] overflow-hidden rounded-[var(--radius-md)] bg-soft">
                  <img src={src ?? ""} alt={`${project.project_name} photo ${i + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {(project.lat && project.lng) ? (
          <section className={`${wrap} flex flex-col gap-5 pb-14`}>
            <h2 className="text-xl font-extrabold md:text-3xl">Location</h2>
            <div className="h-72 md:h-96"><PointsMap points={[{ lat: project.lat, lng: project.lng, label: project.project_name, href: "#" }]} /></div>
          </section>
        ) : null}

        <section id="models" className={`${wrap} flex flex-col gap-5 pb-14`}>
          <h2 className="text-xl font-extrabold md:text-3xl">Models &amp; Floor Plans</h2>
          <ModelsTabs models={models} basePath={basePath} />
        </section>

        {amenities.length ? (
          <section className={`${wrap} flex flex-col gap-4 pb-14`}>
            <h2 className="text-xl font-extrabold md:text-3xl">Amenities &amp; Inclusions</h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {amenities.map((a) => (
                <li key={a.id} className="flex items-center gap-2.5 text-sm">
                  {a.icon_url ? <img src={a.icon_url} alt="" className="h-5 w-5" /> : null}
                  {a.title}
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
