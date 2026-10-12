import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSettings, getLogo } from "@/lib/cms";
import { getModel } from "@/lib/precon";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { PreconLeadSection } from "@/components/site/PreconLeadSection";
import { PromoBanner } from "@/components/site/PromoBanner";
import { getCashbackAmount, formatCashback } from "@/lib/cashback";
import { PreconSectionHeader } from "@/components/site/PreconSectionHeader";
import { PreconBoxHeader } from "@/components/site/PreconBoxHeader";
import { PreconCardCta } from "@/components/site/PreconCardCta";
import { seoTitle } from "@/lib/seo";

const wrap = "mx-auto w-full max-w-7xl px-5 md:px-10";
const card = "rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line shadow-[var(--shadow-card)] bg-white";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; project: string; model: string }> }): Promise<Metadata> {
  const { slug: builder, project, model } = await params;
  const found = await getModel(builder, project, model);
  if (!found) return {};
  const title = await seoTitle(`${found.model.model_name} — ${found.project.project_name} by ${found.builder.builder_name}`);
  const description = `${found.model.model_name} model at ${found.project.project_name} — floor plan, pricing, and VIP buyer incentives.`;
  const url = `https://www.getsetsold.ca/pre-construction/${builder}/${project}/${model}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, type: "website", url },
    twitter: { card: "summary_large_image", title, description },
  };
}

function Stat({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-lg font-bold md:text-2xl">{value ?? "—"}</span>
      <span className="text-[11px] text-muted md:text-xs">{label}</span>
    </div>
  );
}

export default async function ModelPage({ params }: { params: Promise<{ slug: string; project: string; model: string }> }) {
  const { slug: builderSlug, project: projectSlug, model: modelSlug } = await params;
  const [settings, found] = await Promise.all([getSettings(), getModel(builderSlug, projectSlug, modelSlug)]);
  if (!found) notFound();
  const { builder, project, model, siblings, floorplans, gallery, limitedTimePromo, promos, paymentPlan, installments, amenities } = found;
  const logo = await getLogo(settings);
  const basePath = `/pre-construction/${builderSlug}/${projectSlug}`;
  const cashback = getCashbackAmount(model.starting_price, settings.precon_cashback);

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
            { label: project.project_name, href: basePath },
            { label: model.model_name ?? "Model" },
          ]}
          eyebrow={`${model.building_type ?? "Home"} Model · ${project.project_name} by ${builder.builder_name}`}
          title={model.model_name ?? "Model"}
          lede={
            <div className="flex flex-col items-start gap-3">
              <span>
                {model.title && model.title !== model.model_name ? <span className="mb-1 block">{model.title}</span> : null}
                Part of <Link href={basePath} prefetch={false} className="font-medium text-white underline">{project.project_name}</Link> by {builder.builder_name}
              </span>
              {cashback ? (
                <span className="inline-flex flex-col items-start gap-0.5 rounded-[var(--radius-btn,999px)] bg-gradient-to-r from-[#065f46] via-[#059669] to-[#10b981] px-5 py-2.5 text-sm font-bold text-white">
                  <span>Up to {formatCashback(cashback)} Cashback</span>
                  <span className="text-[12px] font-medium text-white/85">— Exclusive Buyer Perk when you buy with us</span>
                </span>
              ) : null}
            </div>
          }
          bgImage={model.model_image_url}
          logoUrl={builder.logo_url}
          logoAlt={builder.builder_name}
          facts={[
            ...(project.city ? [{ value: project.city, label: "City" }] : []),
            { value: model.starting_price ? `$${Number(model.starting_price).toLocaleString()}` : "TBA", label: "Price" },
            ...(model.bedrooms ? [{ value: model.bedrooms, label: "Bedrooms" }] : []),
            ...(model.bathrooms ? [{ value: model.bathrooms, label: "Bathrooms" }] : []),
            ...(model.sqft ? [{ value: model.sqft, label: "Sq Ft" }] : []),
            ...(model.storeys ? [{ value: model.storeys, label: "Storeys" }] : []),
            ...(model.building_type ? [{ value: model.building_type, label: "Type" }] : []),
          ]}
          ctas={[
            { label: "Register Interest", href: "#lead", variant: "primary" },
            { label: "Book a Showing", href: "#lead", variant: "ghost" },
          ]}
        />

        {model.description ? (
          <section className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
            <PreconSectionHeader eyebrow="The Model" heading={model.model_name ?? "Model Details"} />
            <p className="max-w-3xl whitespace-pre-line text-sm leading-relaxed text-muted md:text-base">{model.description}</p>
          </div>
</section>
        ) : null}

        {limitedTimePromo || promos?.length ? (
          <section className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
            <div className="mb-6">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Promotion</div>
              <h2 className="font-display mt-1 text-2xl font-extrabold">Limited-Time Offers</h2>
            </div>
            <div className="flex flex-col gap-4">
              {limitedTimePromo ? <PromoBanner promo={limitedTimePromo} /> : null}
              {(promos ?? []).map((p) => <PromoBanner key={p.id} promo={p} />)}
            </div>
          </div>
</section>
        ) : null}

        {(gallery.length || model.model_image_url) ? (
          <section className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
            <PreconSectionHeader eyebrow="Photos" heading="Image Gallery" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {(gallery.length ? gallery.map((g) => g.image_url) : [model.model_image_url]).map((src, i) => (
                <div key={i} className="aspect-[4/3] overflow-hidden rounded-[var(--radius-md)] bg-soft"><img src={src ?? ""} alt={`${model.model_name} photo ${i + 1}`} className="h-full w-full object-cover" /></div>
              ))}
            </div>
          </div>
</section>
        ) : null}

        {floorplans.length ? (
          <section className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
            <PreconSectionHeader eyebrow="Layout" heading="Floor Plans" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {floorplans.map((fp) => (
                <div key={fp.id} className={`overflow-hidden ${card}`}>
                  {fp.floorplan_image_url ? <img src={fp.floorplan_image_url} alt={fp.floorplan_name ?? "Floor plan"} className="w-full" /> : null}
                  {fp.floorplan_name ? <div className="p-3 text-sm font-medium">{fp.floorplan_name}</div> : null}
                </div>
              ))}
            </div>
          </div>
</section>
        ) : null}

        {paymentPlan && installments.length ? (
          <section className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
            <PreconSectionHeader eyebrow={paymentPlan.title ?? "Deposit Structure"} heading="Payment Plan" />
            <div className={`flex flex-col divide-y divide-line ${card}`}>
              {installments.map((step) => (
                <div key={step.id} className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-sm font-medium">{step.description ?? (step.due_days != null ? `${step.due_days} days` : "—")}</span>
                  <span className="text-sm font-bold text-primary">${Number(step.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
</section>
        ) : null}

        {amenities?.length ? (
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

        {siblings.length ? (
          <section className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
            <PreconSectionHeader eyebrow="Keep Looking" heading="Similar Homes" />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {siblings.map((m) => {
                const cb = getCashbackAmount(m.starting_price, settings.precon_cashback);
                return (
                  <Link key={m.id} href={`${basePath}/${m.slug}`} prefetch={false} className={`group flex flex-col overflow-hidden ${card}`}>
                    <div className="relative aspect-[4/3] bg-soft">
                      {m.model_image_url ? <img src={m.model_image_url} alt={m.model_name ?? ""} className="h-full w-full object-cover" /> : null}
                      {cb ? <span className="absolute right-3 top-3 flex items-center gap-1 rounded-[var(--radius-label)] bg-gradient-to-r from-[#065f46] to-[#059669] px-2.5 py-1 text-[11px] font-semibold text-white">{formatCashback(cb)} cashback</span> : null}
                    </div>
                    <div className="flex flex-col gap-1 p-4">
                      <div className="text-base font-bold text-primary">{m.starting_price ? `$${Number(m.starting_price).toLocaleString()}` : "Price TBA"}</div>
                      <div className="text-sm font-medium">{m.model_name}</div>
                      <div className="text-xs text-muted">{project.project_name} · {builder.builder_name}</div>
                      <PreconCardCta label="View Model" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
</section>
        ) : null}

        <PreconLeadSection
          heading="Interested in This Home?"
          defaultMessage={`Hi, I'm interested in the ${model.model_name ?? "model"} at ${project.project_name} by ${builder.builder_name}${project.city ? `, ${project.city}` : ""}${model.starting_price ? ` ($${Number(model.starting_price).toLocaleString()}` : ""}${model.bedrooms ? ` — ${model.bedrooms} bed` : ""}${model.bathrooms ? `, ${model.bathrooms} bath` : ""}${model.sqft ? `, ${model.sqft} sqft` : ""}${model.starting_price ? `)` : ""}. Please send me more details.`}
          siteName={settings.site_name}
        />
      </main>

      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
