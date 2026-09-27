import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSettings, getLogo } from "@/lib/cms";
import { getModel } from "@/lib/precon";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { LeadForm } from "@/components/blocks/LeadForm";

const wrap = "mx-auto w-full max-w-7xl px-5 md:px-10";
const card = "rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line shadow-[var(--shadow-card)] bg-white";

export async function generateMetadata({ params }: { params: Promise<{ builder: string; project: string; model: string }> }): Promise<Metadata> {
  const { builder, project, model } = await params;
  const found = await getModel(builder, project, model);
  if (!found) return {};
  return { title: `${found.model.model_name} | ${found.project.project_name} | Pre-Construction` };
}

function Stat({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-lg font-bold md:text-2xl">{value ?? "—"}</span>
      <span className="text-[11px] text-muted md:text-xs">{label}</span>
    </div>
  );
}

export default async function ModelPage({ params }: { params: Promise<{ builder: string; project: string; model: string }> }) {
  const { builder: builderSlug, project: projectSlug, model: modelSlug } = await params;
  const [settings, found] = await Promise.all([getSettings(), getModel(builderSlug, projectSlug, modelSlug)]);
  if (!found) notFound();
  const { builder, project, model, siblings, floorplans, gallery, paymentPlan, installments } = found;
  const logo = await getLogo(settings);
  const basePath = `/pre-construction/${builderSlug}/${projectSlug}`;

  return (
    <div style={themeVars(settings)} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      <SiteHeader settings={settings} logo={logo} />

      <main>
        <div className={`${wrap} pb-4 pt-6 text-sm text-muted`}>
          <Link href="/pre-construction" prefetch={false}>Pre-Construction</Link> › <Link href={`/pre-construction/${builderSlug}`} prefetch={false}>{builder.builder_name}</Link> › <Link href={basePath} prefetch={false}>{project.project_name}</Link> › {model.model_name}
        </div>

        <section className={`${wrap} flex flex-col items-start gap-4 pb-8`}>
          {builder.logo_url ? <img src={builder.logo_url} alt={builder.builder_name} className="h-10 w-auto object-contain" /> : null}
          <h1 className="font-display text-2xl font-extrabold md:text-5xl">{model.model_name}</h1>
          {model.title && model.title !== model.model_name ? <p className="text-sm text-muted">{model.title}</p> : null}
          <p className="text-sm text-muted">Part of <Link href={basePath} prefetch={false} className="font-medium text-primary">{project.project_name}</Link> by {builder.builder_name}</p>
          <div className="flex gap-3 pt-1">
            <a href="#lead" className="flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-white md:h-13 md:px-7">Register Interest</a>
            <a href="#lead" className="flex h-11 items-center rounded-full border border-ink px-6 text-sm font-medium md:h-13 md:px-7">Book a Showing</a>
          </div>
        </section>

        <section className={`${wrap} pb-10`}>
          <div className={`grid grid-cols-3 gap-4 p-5 sm:grid-cols-4 md:grid-cols-7 md:p-8 ${card}`}>
            <Stat label="City" value={project.city} />
            <Stat label="Price" value={model.starting_price ? `$${Number(model.starting_price).toLocaleString()}` : "TBA"} />
            <Stat label="Bedrooms" value={model.bedrooms} />
            <Stat label="Bathrooms" value={model.bathrooms} />
            <Stat label="Sq Ft" value={model.sqft} />
            <Stat label="Storeys" value={model.storeys} />
            <Stat label="Type" value={model.building_type} />
          </div>
        </section>

        {model.description ? (
          <section className={`${wrap} pb-10`}>
            <p className="max-w-3xl whitespace-pre-line text-sm leading-relaxed text-muted md:text-base">{model.description}</p>
          </section>
        ) : null}

        {(gallery.length || model.model_image_url) ? (
          <section className={`${wrap} flex flex-col gap-5 pb-14`}>
            <h2 className="text-xl font-extrabold md:text-3xl">Image Gallery</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {(gallery.length ? gallery.map((g) => g.image_url) : [model.model_image_url]).map((src, i) => (
                <div key={i} className="aspect-[4/3] overflow-hidden rounded-[var(--radius-md)] bg-soft"><img src={src ?? ""} alt={`${model.model_name} photo ${i + 1}`} className="h-full w-full object-cover" /></div>
              ))}
            </div>
          </section>
        ) : null}

        {floorplans.length ? (
          <section className={`${wrap} flex flex-col gap-5 pb-14`}>
            <h2 className="text-xl font-extrabold md:text-3xl">Floor Plans</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {floorplans.map((fp) => (
                <div key={fp.id} className={`overflow-hidden ${card}`}>
                  {fp.floorplan_image_url ? <img src={fp.floorplan_image_url} alt={fp.floorplan_name ?? "Floor plan"} className="w-full" /> : null}
                  {fp.floorplan_name ? <div className="p-3 text-sm font-medium">{fp.floorplan_name}</div> : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {paymentPlan && installments.length ? (
          <section className={`${wrap} flex flex-col gap-4 pb-14`}>
            <h2 className="text-xl font-extrabold md:text-3xl">Payment Plan{paymentPlan.title ? `: ${paymentPlan.title}` : ""}</h2>
            <div className={`flex flex-col divide-y divide-line ${card}`}>
              {installments.map((step) => (
                <div key={step.id} className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-sm font-medium">{step.description ?? (step.due_days != null ? `${step.due_days} days` : "—")}</span>
                  <span className="text-sm font-bold text-primary">${Number(step.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {siblings.length ? (
          <section className={`${wrap} flex flex-col gap-5 pb-14`}>
            <h2 className="text-xl font-extrabold md:text-3xl">Similar Homes</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {siblings.map((m) => (
                <Link key={m.id} href={`${basePath}/${m.slug}`} prefetch={false} className={`flex flex-col overflow-hidden ${card}`}>
                  <div className="aspect-[4/3] bg-soft">{m.model_image_url ? <img src={m.model_image_url} alt={m.model_name ?? ""} className="h-full w-full object-cover" /> : null}</div>
                  <div className="flex flex-col gap-1 p-4">
                    <div className="text-base font-bold text-primary">{m.starting_price ? `$${Number(m.starting_price).toLocaleString()}` : "Price TBA"}</div>
                    <div className="text-sm font-medium">{m.model_name}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section id="lead" className={`${wrap} grid gap-6 pb-16 md:grid-cols-2 md:gap-12`}>
          <div className="flex flex-col gap-3">
            <h2 className="text-xl font-extrabold md:text-3xl">Interested in This Home?</h2>
            <p className="text-sm text-muted md:text-lg">From available lots to upgrade options and flexible payment plans — we'll walk you through it all.</p>
          </div>
          <LeadForm data={{ form_key: "precon", heading: "", submit_label: "Get Info" }} siteName={settings.site_name} />
        </section>
      </main>

      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
