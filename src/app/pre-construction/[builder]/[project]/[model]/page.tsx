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

const FAQS = [
  { q: "What is a pre-construction home model?", a: "A specific floor plan or design offered within a new development project, with its own bedroom/bathroom count, square footage, building type, and pricing." },
  { q: "How do pre-construction payment plans work in Ontario?", a: "Payments typically spread over the construction period — a deposit of 5-10% at signing, then installments at milestones like excavation, framing, and occupancy. Total deposits usually range 15-25%." },
  { q: "What is the 10-day rescission period?", a: "Under Ontario's Condominium Act, buyers have a 10-day cooling-off period after signing to cancel for any reason and receive a full deposit refund." },
  { q: "Can I customize my pre-construction home?", a: "Many projects offer customization — kitchen finishes, flooring, fixtures, lighting — especially for earlier buyers. Ask about available upgrade credits." },
];

export async function generateMetadata({ params }: { params: Promise<{ builder: string; project: string; model: string }> }): Promise<Metadata> {
  const { builder, project, model } = await params;
  const found = await getModel(builder, project, model);
  if (!found) return {};
  return { title: `${found.model.name} | ${found.project.name} | Pre-Construction`, description: `${found.model.bedrooms ?? ""} bed, ${found.model.bathrooms ?? ""} bath model at ${found.project.name}.` };
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
  const { builder, project, model, siblings } = found;
  const logo = await getLogo(settings);
  const basePath = `/pre-construction/${builderSlug}/${projectSlug}`;

  return (
    <div style={themeVars(settings)} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      <SiteHeader settings={settings} logo={logo} />

      <main>
        <div className={`${wrap} pb-4 pt-6 text-sm text-muted`}>
          <Link href="/pre-construction" prefetch={false}>Pre-Construction</Link> › <Link href={`/pre-construction/${builderSlug}`} prefetch={false}>{builder.name}</Link> › <Link href={basePath} prefetch={false}>{project.name}</Link> › {model.name}
        </div>

        <section className={`${wrap} flex flex-col items-start gap-4 pb-8`}>
          {builder.logo_url ? <img src={builder.logo_url} alt={builder.name} className="h-10 w-auto object-contain" /> : null}
          <h1 className="font-display text-2xl font-extrabold md:text-5xl">{model.name}</h1>
          <p className="text-sm text-muted">Part of <Link href={basePath} prefetch={false} className="font-medium text-primary">{project.name}</Link> by {builder.name}</p>
          {model.cashback_amount ? (
            <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary md:text-sm">
              Up to ${model.cashback_amount.toLocaleString()} Cashback — Exclusive Buyer Perk
            </span>
          ) : null}
          <div className="flex gap-3 pt-1">
            <a href="#lead" className="flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-white md:h-13 md:px-7">Register Interest</a>
            <a href="#lead" className="flex h-11 items-center rounded-full border border-ink px-6 text-sm font-medium md:h-13 md:px-7">Book a Showing</a>
          </div>
        </section>

        <section className={`${wrap} pb-10`}>
          <div className={`grid grid-cols-3 gap-4 p-5 sm:grid-cols-4 md:grid-cols-8 md:p-8 ${card}`}>
            <Stat label="City" value={project.city} />
            <Stat label="Status" value={model.status} />
            <Stat label="Price" value={model.price_from ? `$${model.price_from.toLocaleString()}` : "TBA"} />
            <Stat label="Bedrooms" value={model.bedrooms} />
            <Stat label="Bathrooms" value={model.bathrooms} />
            <Stat label="Sq Ft" value={model.sqft?.toLocaleString() ?? null} />
            <Stat label="Storeys" value={model.storeys} />
            <Stat label="Building Type" value={model.building_type} />
          </div>
        </section>

        {model.gallery.length ? (
          <section className={`${wrap} flex flex-col gap-5 pb-14`}>
            <h2 className="text-xl font-extrabold md:text-3xl">Image Gallery</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {model.gallery.map((src, i) => (
                <div key={i} className="aspect-[4/3] overflow-hidden rounded-[var(--radius-md)] bg-soft"><img src={src} alt={`${model.name} photo ${i + 1}`} className="h-full w-full object-cover" /></div>
              ))}
            </div>
          </section>
        ) : null}

        {model.floor_plans.length ? (
          <section className={`${wrap} flex flex-col gap-5 pb-14`}>
            <h2 className="text-xl font-extrabold md:text-3xl">Floor Plans</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {model.floor_plans.map((src, i) => (
                <div key={i} className={`overflow-hidden ${card}`}><img src={src} alt={`Floor plan ${i + 1}`} className="w-full" /></div>
              ))}
            </div>
          </section>
        ) : null}

        {model.amenities.length ? (
          <section className={`${wrap} flex flex-col gap-4 pb-14`}>
            <h2 className="text-xl font-extrabold md:text-3xl">Amenities &amp; Inclusions</h2>
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
              {model.amenities.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-primary"><path d="M20 6 9 17l-5-5" /></svg>
                  {a}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {model.payment_plan.length ? (
          <section className={`${wrap} flex flex-col gap-4 pb-14`}>
            <h2 className="text-xl font-extrabold md:text-3xl">Payment Plans</h2>
            <div className={`flex flex-col divide-y divide-line ${card}`}>
              {model.payment_plan.map((step, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-sm font-medium">{step.milestone}</span>
                  <span className="text-sm font-bold text-primary">{step.percent}%</span>
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
                  <div className="aspect-[4/3] bg-soft">{m.gallery[0] ? <img src={m.gallery[0]} alt={m.name} className="h-full w-full object-cover" /> : null}</div>
                  <div className="flex flex-col gap-1 p-4">
                    <div className="text-base font-bold text-primary">{m.price_from ? `$${m.price_from.toLocaleString()}` : "Price TBA"}</div>
                    <div className="text-sm font-medium">{m.name}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className={`${wrap} flex flex-col gap-5 pb-14`}>
          <h2 className="text-xl font-extrabold md:text-3xl">Frequently Asked Questions</h2>
          <div className="flex flex-col gap-5">
            {FAQS.map((f, i) => (
              <div key={i} className="border-l-4 border-primary/30 pl-5">
                <h3 className="text-base font-bold md:text-lg">{f.q}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

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
