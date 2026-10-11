import type { Metadata } from "next";
import Link from "next/link";
import { getSettings, getLogo } from "@/lib/cms";
import { getAllModels } from "@/lib/precon";
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
  title: "Pre-Construction Models & Floor Plans in Ontario | GetSetSold",
  description: "Compare every pre-construction model across Ontario — layouts, sizes, and starting prices side by side.",
};

export default async function ModelsPage() {
  const settings = await getSettings();
  const logo = await getLogo(settings);
  const models = await getAllModels();
  const projectCount = new Set(models.map((m) => m.project_slug).filter(Boolean)).size;

  return (
    <div style={themeVars(settings)} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      <SiteHeader settings={settings} logo={logo} />
      <main className="pb-16">
        <PreconBoxHeader
          crumbs={[{ label: "Pre-Construction", href: "/pre-construction" }, { label: "Models" }]}
          eyebrow="Pre-Construction Ontario"
          title="Floor plans & models, ready to compare."
          lede="Every model across every project — compare layouts, sizes, and starting prices side by side."
          facts={[
            { value: String(models.length), label: "Models" },
            { value: String(projectCount), label: "Projects" },
          ]}
        />

        <section className="border-t border-line">
<div className="${wrap} py-[50px]">
          <PreconSectionHeader eyebrow="Catalogue" heading="All Models" />
          {models.length ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {models.map((m) => {
                const cb = getCashbackAmount(m.starting_price, settings.precon_cashback);
                const href = m.builder_slug && m.project_slug && m.slug
                  ? `/pre-construction/${m.builder_slug}/${m.project_slug}/${m.slug}`
                  : null;
                const inner = (
                  <>
                    <div className="relative aspect-[4/3] bg-soft">
                      {m.model_image_url ? <img src={m.model_image_url} alt={m.model_name ?? ""} className="h-full w-full object-cover" /> : null}
                      {m.building_type ? <span className="absolute left-3 top-3 rounded-[var(--radius-label)] bg-black/75 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">{m.building_type}</span> : null}
                      {cb ? <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-[var(--radius-label)] bg-gradient-to-r from-[#065f46] to-[#059669] px-2.5 py-1 text-[11px] font-semibold text-white">{formatCashback(cb)} cashback</span> : null}
                    </div>
                    <div className="flex flex-col gap-1.5 p-5">
                      <div className="font-display text-xl font-extrabold">
                        {m.starting_price ? `$${Number(m.starting_price).toLocaleString()}` : "Price TBA"} <span className="text-[12.5px] font-medium text-muted">starting from</span>
                      </div>
                      <div className="text-[16.5px] font-bold">{m.model_name ?? "Model"}</div>
                      <div className="text-[13.5px] text-muted">
                        {[m.project_name, m.builder_name].filter(Boolean).join(" · ")}
                        {m.project_city ? ` — ${m.project_city}` : ""}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1.5">
                        {m.bedrooms ? <span className="rounded-[var(--radius-btn,999px)] bg-soft px-3 py-1 text-[12.5px] font-semibold">{m.bedrooms} bd</span> : null}
                        {m.bathrooms ? <span className="rounded-[var(--radius-btn,999px)] bg-soft px-3 py-1 text-[12.5px] font-semibold">{m.bathrooms} ba</span> : null}
                        {m.sqft ? <span className="rounded-[var(--radius-btn,999px)] bg-soft px-3 py-1 text-[12.5px] font-semibold">{m.sqft} sqft</span> : null}
                      </div>
                      {href ? <PreconCardCta label="View Model" /> : null}
                    </div>
                  </>
                );
                return href ? (
                  <Link key={m.id} href={href} prefetch={false} className={`group flex flex-col overflow-hidden ${card}`}>{inner}</Link>
                ) : (
                  <div key={m.id} className={`flex flex-col overflow-hidden ${card}`}>{inner}</div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted">No models listed yet.</p>
          )}
        </div>
</section>
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
