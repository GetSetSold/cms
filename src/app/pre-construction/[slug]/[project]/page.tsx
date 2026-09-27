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
import { PromoBanner } from "@/components/site/PromoBanner";
import { LeadForm } from "@/components/blocks/LeadForm";
import { getCashbackAmount, formatCashback } from "@/lib/cashback";
import { PreconSectionHeader } from "@/components/site/PreconSectionHeader";

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

  return (
    <div style={themeVars(settings)} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      <SiteHeader settings={settings} logo={logo} />

      <main>
        <div className={`${wrap} pb-4 pt-6 text-sm text-muted`}>
          <Link href="/pre-construction" prefetch={false}>Pre-Construction</Link> › <Link href={`/pre-construction/${builderSlug}`} prefetch={false}>{builder.builder_name}</Link> › {project.project_name}
        </div>

        <section
          className="relative flex min-h-[55vh] flex-col justify-end overflow-hidden bg-ink bg-cover bg-center"
          style={project.main_image_url ? { backgroundImage: `url(${project.main_image_url})` } : undefined}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />
          <div className={`${wrap} relative z-10 flex flex-col items-start gap-4 py-12`}>
            {builder.logo_url ? <img src={builder.logo_url} alt={builder.builder_name} className="h-10 w-auto rounded-lg bg-white/90 object-contain p-1.5" /> : null}
            <h1 className="font-display text-2xl font-extrabold text-white md:text-5xl">{project.project_name}</h1>
            {(() => {
              const cb = getCashbackAmount(project.p_start_price, settings.precon_cashback);
              return cb ? (
                <span className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#065f46] via-[#059669] to-[#10b981] px-4 py-2 text-sm font-bold text-white">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                  Up to {formatCashback(cb)} Cashback — Exclusive Buyer Perk
                </span>
              ) : null;
            })()}
            {promos[0]?.badge ? (
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur md:text-sm">{promos[0].badge} — {promos[0].title}</span>
            ) : null}
            <div className="flex gap-3 pt-1">
              <a href="#lead" className="flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-white md:h-13 md:px-7">Register Now</a>
              <a href="#models" className="flex h-11 items-center rounded-full border border-white/50 px-6 text-sm font-medium text-white md:h-13 md:px-7">View Models</a>
            </div>
          </div>
        </section>

        <section className={`${wrap} flex flex-col gap-10 pb-14 pt-14`}>
          <PreconSectionHeader eyebrow="The Project" heading={project.project_name} />
          <div className="grid grid-cols-1 gap-10 md:grid-cols-[1fr_360px]">
            <div className="flex flex-col gap-6">
              {project.project_message ? (
                <p className="rounded-r-lg border-l-[3px] border-primary bg-primary/5 px-5 py-4 text-sm leading-relaxed md:text-base">{project.project_message}</p>
              ) : null}
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-line bg-line md:grid-cols-4">
                {[
                  ["City", project.city], ["Status", project.project_status],
                  ["From", project.p_start_price ? `$${Number(project.p_start_price).toLocaleString()}` : "TBA"],
                  ["Beds", project.beds], ["Baths", project.baths], ["Sq Ft", project.sqft],
                  ["VIP Release", project.vip_release],
                ].map(([label, value], i) => (
                  <div key={label} className={`flex flex-col items-center gap-1 bg-white p-5 text-center ${i === 0 ? "bg-soft" : ""}`}>
                    <span className="font-display text-xl font-bold text-primary md:text-2xl">{value ?? "—"}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</span>
                  </div>
                ))}
              </div>
              {project.project_description ? <p className="text-sm leading-relaxed text-muted md:text-base">{project.project_description}</p> : null}
            </div>

            <div className="flex flex-col gap-5 self-start rounded-[var(--radius-lg)] bg-ink p-7 text-white">
              <div>
                <h3 className="font-display text-xl font-bold">{project.project_name}</h3>
                <p className="text-sm text-white/60">{project.city}, Ontario</p>
              </div>
              <div className="font-display text-2xl font-bold text-primary">{project.p_start_price ? `From $${Number(project.p_start_price).toLocaleString()}` : "Price TBA"}</div>
              {builder.logo_url ? (
                <div className="flex items-center gap-3 border-t border-white/10 py-3">
                  <img src={builder.logo_url} alt={builder.builder_name} className="h-11 w-11 rounded-lg bg-white/95 object-contain p-1" />
                  <div><div className="text-[11px] uppercase tracking-wide text-white/40">Builder</div><div className="text-sm font-bold">{builder.builder_name}</div></div>
                </div>
              ) : null}
              {(() => {
                const cb = getCashbackAmount(project.p_start_price, settings.precon_cashback);
                return cb ? (
                  <div className="flex items-center gap-3 rounded-lg bg-gradient-to-br from-[#065f46] to-[#059669] p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg">✓</span>
                    <div><div className="font-display text-lg font-bold">{formatCashback(cb)} Cashback</div><div className="text-[11px] text-white/70">Your exclusive advantage when you buy with us</div></div>
                  </div>
                ) : null;
              })()}
              <a href="#lead" className="flex h-12 items-center justify-center rounded-lg bg-primary text-sm font-bold">Register Now</a>
              <a href="#lead" className="flex h-12 items-center justify-center rounded-lg border border-white/30 text-sm font-bold">Request Brochure</a>
              <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
                {[project.project_status, project.vip_release ? `VIP: ${project.vip_release}` : null, project.city].filter(Boolean).map((tag) => (
                  <span key={tag} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {limitedTimePromo ? (
          <section className={`${wrap} pb-10`}>
            <PromoBanner promo={limitedTimePromo} />
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
          <section className={`${wrap} flex flex-col gap-6 pb-14`}>
            <PreconSectionHeader eyebrow="Photos" heading="Image Gallery" />
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
          <section className={`${wrap} flex flex-col gap-6 pb-14`}>
            <PreconSectionHeader eyebrow="Where You'll Live" heading="Location" />
            <div className="grid grid-cols-1 gap-0 overflow-hidden rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] md:grid-cols-[1fr_320px]">
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
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${project.lat},${project.lng}`} target="_blank" rel="noopener" className="flex h-11 items-center justify-center gap-2 rounded-lg bg-ink text-sm font-bold text-white">Get Directions</a>
              </div>
            </div>
          </section>
        ) : null}

        <section id="models" className="bg-ink py-14">
          <div className={`${wrap} flex flex-col gap-6`}>
            <PreconSectionHeader eyebrow="Available Homes" heading="Models & Floor Plans" dark />
            <ModelsTabs models={models} basePath={basePath} cashback={settings.precon_cashback} />
          </div>
        </section>

        {amenities.length ? (
          <section className={`${wrap} flex flex-col gap-6 py-14`}>
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
          </section>
        ) : null}

        <section id="lead" className={`${wrap} pb-16 pt-6`}>
          <PreconSectionHeader eyebrow="Get In Touch" heading="Interested in This Project?" />
          <div className="grid gap-10 pt-10 md:grid-cols-2 md:gap-16">
            <div className="flex flex-col gap-5">
              <h3 className="font-display text-xl font-bold md:text-2xl">Let's Find Your Perfect Home</h3>
              <p className="text-sm text-muted md:text-base">Our team is ready to walk you through every detail of this project — from available lots to floor plans, upgrade options, and payment plans.</p>
              {[
                ["Fast Response", "We respond to all inquiries within 24 hours."],
                ["Private Showings", "Book a private tour at a time that works for you."],
                ["Full Brochure", "Get detailed specs, pricing, and floor plan packages."],
                ["No Obligation", "Your information stays private. No pressure, ever."],
              ].map(([title, desc]) => (
                <div key={title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">●</span>
                  <div><div className="text-sm font-bold">{title}</div><div className="text-xs text-muted">{desc}</div></div>
                </div>
              ))}
            </div>
            <LeadForm data={{ form_key: "precon", heading: "Register Your Interest", submit_label: "Let's Connect" }} siteName={settings.site_name} />
          </div>
        </section>
      </main>

      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
