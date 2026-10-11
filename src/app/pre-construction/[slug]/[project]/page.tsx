import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSettings, getLogo } from "@/lib/cms";
import { getProject } from "@/lib/precon";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { PointsMap } from "@/components/site/PointsMap";
import { ModelsTabs } from "@/components/site/ModelsTabs";
import { PromoBanner } from "@/components/site/PromoBanner";
import { PreconLeadSection } from "@/components/site/PreconLeadSection";
import { getCashbackAmount, formatCashback } from "@/lib/cashback";
import { PreconSectionHeader } from "@/components/site/PreconSectionHeader";
import { PreconBoxHeader } from "@/components/site/PreconBoxHeader";


const wrap = "mx-auto w-full max-w-7xl px-5 md:px-10";
const card = "rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line shadow-[var(--shadow-card)] bg-white";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; project: string }> }): Promise<Metadata> {
  const { slug: builder, project } = await params;
  const found = await getProject(builder, project);
  if (!found) return {};
  return { title: `${found.project.project_name} | Pre-Construction in ${found.project.city ?? "Ontario"}` };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string; project: string }> }) {
  const { slug: builderSlug, project: projectSlug } = await params;
  const [settings, found] = await Promise.all([getSettings(), getProject(builderSlug, projectSlug)]);
  if (!found) notFound();
  const { builder, project, models, promos, limitedTimePromo, amenities, gallery } = found;
  const logo = await getLogo(settings);
  const basePath = `/pre-construction/${builderSlug}/${projectSlug}`;
  const cashback = getCashbackAmount(project.p_start_price, settings.precon_cashback);

  return (
    <div style={themeVars(settings)} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      <SiteHeader settings={settings} logo={logo} />

      <main>
        <PreconBoxHeader
          crumbs={[
            { label: "Pre-Construction", href: "/pre-construction" },
            { label: builder.builder_name, href: `/pre-construction/${builderSlug}` },
            { label: project.project_name },
          ]}
          eyebrow={`Pre-Construction Project${project.city ? ` · ${project.city}, Ontario` : " · Ontario"}`}
          title={project.project_name}
          lede={project.project_message}
          bgImage={project.main_image_url}
          logoUrl={builder.logo_url}
          logoAlt={builder.builder_name}
          facts={[
            ...(project.p_start_price ? [{ value: `$${Number(project.p_start_price).toLocaleString()}`, label: "Starting from" }] : []),
            ...(project.beds ? [{ value: project.beds, label: "Beds" }] : []),
            ...(project.baths ? [{ value: project.baths, label: "Baths" }] : []),
            ...(project.sqft ? [{ value: project.sqft, label: "Sq Ft" }] : []),
            ...(project.project_status ? [{ value: project.project_status, label: "Status" }] : []),
            ...(project.vip_release ? [{ value: project.vip_release, label: "VIP Release" }] : []),
          ]}
          ctas={[
            { label: "Register Interest", href: "#lead", variant: "primary" },
            { label: "View Models", href: "#models", variant: "ghost" },
          ]}
        />

        {cashback ? (
          <section className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border-2 border-dashed border-primary bg-[#f2f7ff] p-6 md:p-7">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Buyer Cashback Offer</div>
                <div className="font-display mt-1.5 text-xl font-extrabold md:text-2xl">Up to {formatCashback(cashback)} Cashback — Exclusive Buyer Perk</div>
                <div className="mt-1 text-sm text-muted">Limited availability — speak with an agent today. No obligation required.</div>
              </div>
              <a href="#lead" className="flex h-12 items-center rounded-[var(--radius-btn)] bg-ink px-7 text-sm font-bold text-white">Claim This Offer →</a>
            </div>
          </div>
</section>
        ) : null}

        {project.project_description ? (
          <section className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
            <p className="max-w-3xl whitespace-pre-line text-sm leading-relaxed text-muted md:text-base">{project.project_description}</p>
          </div>
</section>
        ) : null}

        {limitedTimePromo ? (
          <section className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
            <PromoBanner promo={limitedTimePromo} />
          </div>
</section>
        ) : null}

        {promos.length ? (
          <section className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {promos.map((promo) => (
                <div key={promo.id} className={`flex flex-col gap-1 p-4 ${card}`}>
                  {promo.badge ? <span className="w-fit rounded-[var(--radius-label)] bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">{promo.badge}</span> : null}
                  <strong className="text-sm">{promo.title}</strong>
                  {promo.description ? <span className="text-xs text-muted">{promo.description}</span> : null}
                </div>
              ))}
            </div>
          </div>
</section>
        ) : null}

        {(gallery.length || project.main_image_url) ? (
          <section className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
            <PreconSectionHeader eyebrow="Photos" heading="Image Gallery" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {(gallery.length ? gallery.map((g) => g.image_url) : [project.main_image_url]).map((src, i) => (
                <div key={i} className="aspect-[4/3] overflow-hidden rounded-[var(--radius-md)] bg-soft">
                  <img src={src ?? ""} alt={`${project.project_name} photo ${i + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </div>
</section>
        ) : null}

        {(project.lat && project.lng) ? (
          <section className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
            <PreconSectionHeader eyebrow="Where You'll Live" heading="Location" />
            <div className={`grid grid-cols-1 gap-0 overflow-hidden md:grid-cols-[1fr_320px] ${card}`}>
              <div className="h-72 md:h-[420px]"><PointsMap points={[{ lat: project.lat, lng: project.lng, label: project.project_name, href: "#" }]} /></div>
              <div className="flex flex-col gap-4 bg-white p-6">
                <div><h3 className="font-display text-lg font-bold">{project.project_name}</h3><p className="text-xs font-semibold text-primary">{project.city}, Ontario</p></div>
                <div className="flex flex-col divide-y divide-line">
                  {[["City", project.city], ["Status", project.project_status], ["Starting From", project.p_start_price ? `$${Number(project.p_start_price).toLocaleString()}` : "TBA"], ["VIP Release", project.vip_release]].map(([label, value]) => (
                    <div key={label} className="flex flex-col gap-0.5 py-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</span>
                      <span className="text-sm font-semibold">{value ?? "—"}</span>
                    </div>
                  ))}
                </div>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${project.lat},${project.lng}`} target="_blank" rel="noopener" className="flex h-11 items-center justify-center gap-2 rounded-[var(--radius-btn)] bg-ink text-sm font-bold text-white">Get Directions</a>
              </div>
            </div>
          </div>
</section>
        ) : null}

        <section id="models" className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
          <PreconSectionHeader eyebrow="Available Homes" heading="Models & Floor Plans" />
          <ModelsTabs models={models} basePath={basePath} cashback={settings.precon_cashback} />
        </div>
</section>

        {amenities.length ? (
          <section className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
            <PreconSectionHeader eyebrow="Features" heading="Amenities & Inclusions" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {amenities.map((a) => (
                <div key={a.id} className={`flex flex-col items-center gap-3 p-6 text-center ${card}`}>
                  {a.icon_url ? <img src={a.icon_url} alt="" className="h-12 w-12 object-contain" /> : null}
                  <div className="text-sm font-bold">{a.title}</div>
                  {a.description ? <div className="text-xs text-muted">{a.description}</div> : null}
                </div>
              ))}
            </div>
          </div>
</section>
        ) : null}

        <PreconLeadSection
          heading="Interested in This Project?"
          defaultMessage={`Hi, I'm interested in ${project.project_name} by ${builder.builder_name}${project.city ? ` in ${project.city}` : ""}${project.p_start_price ? ` (from $${Number(project.p_start_price).toLocaleString()})` : ""}. Please send me the price list, floor plans, and availability.`}
          siteName={settings.site_name}
        />
      </main>

      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
