import type { Metadata } from "next";
import Link from "next/link";
import { getSettings, getLogo } from "@/lib/cms";
import { getProjects, getBuilders, getCities, getAllModels, getAllFloorplans } from "@/lib/precon";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { PreconBoxHeader } from "@/components/site/PreconBoxHeader";
import { PreconSectionHeader } from "@/components/site/PreconSectionHeader";
import { PreconCardCta } from "@/components/site/PreconCardCta";
import { PreconLeadSection } from "@/components/site/PreconLeadSection";
import { getCashbackAmount, formatCashback } from "@/lib/cashback";

const wrap = "mx-auto w-full max-w-7xl px-5 md:px-10";
const card = "rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line shadow-[var(--shadow-card)] bg-white";

export const metadata: Metadata = {
  title: "Pre-Construction Homes in Ontario | GetSetSold",
  description: "VIP access to pre-construction projects across Ontario — floor plans, pricing, and builder incentives, straight from the source.",
};

const WHY_BUY = [
  ["Equity Growth", "Lock in today's price and benefit from market appreciation during the construction period. Most buyers see significant equity gains before closing."],
  ["Full Customization", "Choose your finishes, layouts, and upgrades from the ground up. Personalize every detail to match your lifestyle and taste preferences."],
  ["Flexible Payments", "Extended deposit structures spread payments over the build timeline, making it easier to manage your finances compared to resale purchases."],
  ["Tarion Warranty", "All new homes in Ontario come with Tarion warranty coverage, protecting your investment with comprehensive structural and component guarantees."],
  ["VIP Incentives", "Get exclusive access to developer incentives including bonus upgrades, price reductions, closing cost credits, and free design centre allowances."],
  ["Energy Efficient", "New builds meet the latest building codes with modern insulation, efficient HVAC systems, and smart home technology built right in."],
];

const FAQS = [
  ["What is pre-construction real estate in Ontario?", "Pre-construction real estate refers to homes, condos, and townhomes that are sold before they are built. Buyers secure units at current market prices with flexible deposit structures, often benefiting from VIP pricing, developer incentives, and significant equity appreciation by the time the project is completed."],
  ["How much deposit is required for a pre-construction home in Ontario?", "Deposit structures vary by builder and project, but typically range from 15% to 25% of the purchase price, spread over the construction timeline. Common structures include 5% at signing with further installments at 30, 60, and 90 days or on occupancy milestones."],
  ["Is buying pre-construction a good investment in Ontario?", "Pre-construction can be an excellent investment in Ontario due to strong population growth, limited housing supply, and historically rising property values. Buyers lock in today's price and may see 10–20% or more in equity appreciation by completion."],
  ["What cities in Ontario have the best pre-construction projects?", "Top cities for pre-construction in Ontario include Toronto, Mississauga, Brampton, Vaughan, Milton, Oakville, Hamilton, Ottawa, Markham, and Scarborough. Each city offers a different mix of condo, townhome, and detached opportunities."],
  ["What is the 10-day rescission period for pre-construction in Ontario?", "Under Ontario's Condominium Act, buyers have a 10-day cooling-off period after signing a purchase agreement for a pre-construction condo. During this period, you can cancel the agreement for any reason and receive a full refund of your deposit."],
];

export default async function PreConstructionHub() {
  const settings = await getSettings();
  const logo = await getLogo(settings);
  const [projects, builders, cities, allModels, allFloorplans] = await Promise.all([getProjects(), getBuilders(), getCities(), getAllModels(), getAllFloorplans()]);
  const featuredModels = allModels.slice(0, 3);
  const featuredFloorplans = allFloorplans.slice(0, 3);
  const featured = projects.slice(0, 6);
  const topBuilders = builders.slice(0, 4);
  const headerImages = projects.map((p) => p.main_image_url).filter(Boolean) as string[];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <div style={themeVars(settings)} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <SiteHeader settings={settings} logo={logo} />
      <main className="pb-16">
        <PreconBoxHeader
          crumbs={[{ label: "Pre-Construction" }]}
          eyebrow="Pre-Construction Ontario"
          title="Find Your Dream Home Before It's Built"
          lede="VIP access to pre-construction projects across Ontario — floor plans, pricing, and builder incentives, straight from the source."
          bgImages={headerImages}
          facts={[
            { value: String(projects.length), label: "Projects" },
            { value: String(builders.length), label: "Builders" },
            { value: String(cities.length), label: "Cities" },
          ]}
          ctas={[
            { label: "Get Pre-Con Alerts", href: "/pre-con-alerts", variant: "primary" },
            { label: "Browse Projects", href: "/project", variant: "ghost" },
          ]}
        />

        <section className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
          <div className="mb-[50px] flex items-end justify-between gap-4">
            <PreconSectionHeader eyebrow="Featured" heading="All Pre-Construction Projects" />
            <Link href="/project" prefetch={false} className="shrink-0 text-sm font-bold text-primary">View all projects →</Link>
          </div>
          {featured.length ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((p) => {
                const cb = getCashbackAmount(p.p_start_price, settings.precon_cashback);
                return (
                  <Link key={p.id} href={`/pre-construction/${p.builder.slug}/${p.slug}`} prefetch={false} className={`group flex flex-col overflow-hidden ${card}`}>
                    <div className="relative aspect-[4/3] bg-soft">
                      {p.main_image_url ? <img src={p.main_image_url} alt={p.project_name} className="h-full w-full object-cover" /> : null}
                      {p.project_status ? <span className="absolute left-3 top-3 rounded-[var(--radius-label)] bg-black/75 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">{p.project_status}</span> : null}
                      {p.vip_release === "Yes" ? <span className="absolute right-3 top-3 rounded-[var(--radius-label)] bg-amber-500 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">VIP Release</span> : null}
                      {cb ? <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-[var(--radius-label)] bg-gradient-to-r from-[#065f46] to-[#059669] px-2.5 py-1 text-[11px] font-semibold text-white">{formatCashback(cb)} cashback</span> : null}
                    </div>
                    <div className="flex flex-col gap-1.5 p-5">
                      <div className="font-display text-xl font-extrabold">
                        {p.p_start_price ? `$${Number(p.p_start_price).toLocaleString()}` : "Price TBA"} <span className="text-[12.5px] font-medium text-muted">starting from</span>
                      </div>
                      <div className="text-[16.5px] font-bold">{p.project_name}</div>
                      <div className="text-[13.5px] text-muted">{p.builder.builder_name}{p.city ? ` · ${p.city}` : ""}</div>
                      <div className="flex flex-wrap gap-2 pt-1.5">
                        {p.beds ? <span className="rounded-[var(--radius-btn,999px)] bg-soft px-3 py-1 text-[12.5px] font-semibold">{p.beds} bd</span> : null}
                        {p.baths ? <span className="rounded-[var(--radius-btn,999px)] bg-soft px-3 py-1 text-[12.5px] font-semibold">{p.baths} ba</span> : null}
                        {p.sqft ? <span className="rounded-[var(--radius-btn,999px)] bg-soft px-3 py-1 text-[12.5px] font-semibold">{p.sqft} sqft</span> : null}
                      </div>
                      <PreconCardCta label="View Project" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-muted">No projects listed yet.</p>
          )}
        </div>
</section>

        {cities.length ? (
          <section className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
            <PreconSectionHeader eyebrow="Locations" heading="Browse by City" />
            <div className="flex flex-wrap gap-2.5 pt-2">
              {cities.map((c) => (
                <Link
                  key={c.city}
                  href={`/pre-construction/${c.city.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  prefetch={false}
                  className="flex h-11 items-center gap-2 rounded-[var(--radius-btn,999px)] border border-line bg-white px-5 text-sm font-semibold shadow-[var(--shadow-card)]"
                >
                  {c.city}
                  <span className="rounded-[var(--radius-btn,999px)] bg-soft px-2 py-0.5 text-xs font-bold text-muted">{c.count}</span>
                </Link>
              ))}
            </div>
          </div>
</section>
        ) : null}

        <section className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
          <div className="mb-[50px] flex items-end justify-between gap-4">
            <PreconSectionHeader eyebrow="Builders" heading="Featured Builders" />
            <Link href="/builder" prefetch={false} className="shrink-0 text-sm font-bold text-primary">View all builders →</Link>
          </div>
          {topBuilders.length ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {topBuilders.map((b) => (
                <Link key={b.id} href={`/pre-construction/${b.slug}`} prefetch={false} className={`group flex flex-col items-center gap-2 p-6 text-center ${card}`}>
                  <span className="flex h-[54px] w-full items-center justify-center">
                    {b.logo_url ? (
                      <img src={b.logo_url} alt={b.builder_name} className="max-h-[48px] w-auto max-w-[150px] object-contain" />
                    ) : (
                      <span className="font-display text-lg font-extrabold tracking-tight">{b.builder_name}</span>
                    )}
                  </span>
                  <span className="text-[14.5px] font-bold">{b.builder_name}</span>
                  <span className="text-[12.5px] text-muted">{b.project_count} project{b.project_count === 1 ? "" : "s"}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted">No builders listed yet.</p>
          )}
        </div>
</section>

        <section className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
          <div className="mb-[50px] flex items-end justify-between gap-4">
            <PreconSectionHeader eyebrow="Models" heading="Compare Home Models and Plans" />
            <Link href="/pre-construction/models" prefetch={false} className="shrink-0 text-sm font-bold text-primary">View all models →</Link>
          </div>
          <p className="max-w-2xl pb-8 text-[15px] leading-relaxed text-muted">
            Compare floor plans — every model across every project, side by side before you visit a sales centre.
          </p>
          {featuredModels.length ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featuredModels.map((m) => (
                <Link key={m.id} href={`/pre-construction/${m.builder_slug}/${m.project_slug}/${m.slug}`} prefetch={false} className={`group flex flex-col overflow-hidden ${card}`}>
                  <div className="relative aspect-[4/3] bg-soft">
                    {m.model_image_url ? <img src={m.model_image_url} alt={m.model_name ?? ""} className="h-full w-full object-cover" /> : null}
                    {m.building_type ? <span className="absolute left-3 top-3 rounded-[var(--radius-label)] bg-black/75 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">{m.building_type}</span> : null}
                  </div>
                  <div className="flex flex-col gap-1.5 p-5">
                    <div className="font-display text-xl font-extrabold">
                      {m.starting_price ? `$${Number(m.starting_price).toLocaleString()}` : "Price TBA"} <span className="text-[12.5px] font-medium text-muted">starting from</span>
                    </div>
                    <div className="text-[16.5px] font-bold">{m.model_name}</div>
                    <div className="text-[13.5px] text-muted">{m.project_name} · {m.builder_name}</div>
                    <div className="flex flex-wrap gap-2 pt-1.5">
                      {m.bedrooms ? <span className="rounded-[var(--radius-btn,999px)] bg-soft px-3 py-1 text-[12.5px] font-semibold">{m.bedrooms} bd</span> : null}
                      {m.bathrooms ? <span className="rounded-[var(--radius-btn,999px)] bg-soft px-3 py-1 text-[12.5px] font-semibold">{m.bathrooms} ba</span> : null}
                      {m.sqft ? <span className="rounded-[var(--radius-btn,999px)] bg-soft px-3 py-1 text-[12.5px] font-semibold">{m.sqft} sqft</span> : null}
                    </div>
                    <PreconCardCta label="View Model" />
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
</section>

        <section className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
          <div className="mb-[50px] flex items-end justify-between gap-4">
            <PreconSectionHeader eyebrow="Floor Plans" heading="Browse Floor Plans" />
            <Link href="/pre-construction/floorplans" prefetch={false} className="shrink-0 text-sm font-bold text-primary">View all floor plans →</Link>
          </div>
          <p className="max-w-2xl pb-8 text-[15px] leading-relaxed text-muted">
            Architectural layouts from every project — study the details before you book a showing.
          </p>
          {featuredFloorplans.length ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featuredFloorplans.map((f) => {
                const href = f.builder_slug && f.project_slug && f.model_slug
                  ? `/pre-construction/${f.builder_slug}/${f.project_slug}/${f.model_slug}`
                  : null;
                const inner = (
                  <>
                    <div className="relative aspect-[4/3] bg-white">
                      {f.floorplan_image_url ? <img src={f.floorplan_image_url} alt={f.floorplan_name ?? f.model_name ?? ""} className="h-full w-full object-contain" /> : null}
                    </div>
                    <div className="flex flex-col gap-1.5 p-5">
                      <div className="text-[16.5px] font-bold">{f.floorplan_name ?? f.model_name ?? "Floor Plan"}</div>
                      <div className="text-[13.5px] text-muted">
                        {[f.model_name, f.project_name, f.builder_name].filter(Boolean).join(" · ")}
                      </div>
                      {href ? <PreconCardCta label="View Model" /> : null}
                    </div>
                  </>
                );
                return href ? (
                  <Link key={f.id} href={href} prefetch={false} className={`group flex flex-col overflow-hidden ${card}`}>{inner}</Link>
                ) : (
                  <div key={f.id} className={`flex flex-col overflow-hidden ${card}`}>{inner}</div>
                );
              })}
            </div>
          ) : null}
        </div>
</section>

        <section className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
          <PreconSectionHeader eyebrow="Advantages" heading="Why Buy Pre-Construction?" />
          <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_BUY.map(([title, desc]) => (
              <div key={title} className={`flex flex-col gap-2 p-6 ${card}`}>
                <div className="font-display text-[16px] font-bold">{title}</div>
                <p className="text-sm leading-relaxed text-muted">{desc}</p>
              </div>
            ))}
          </div>
        </div>
</section>

        <section className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
          <PreconSectionHeader eyebrow="FAQ" heading="Frequently Asked Questions" />
          <div className={`mt-2 flex flex-col divide-y divide-line ${card} px-6`}>
            {FAQS.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15.5px] font-bold [&::-webkit-details-marker]:hidden">
                  {q}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-btn,999px)] bg-soft text-lg font-bold transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="pt-3 text-sm leading-relaxed text-muted">{a}</p>
              </details>
            ))}
          </div>
        </div>
</section>

        <PreconLeadSection
          heading="Ready to Find Your New Home?"
          defaultMessage="Hi, I'm interested in pre-construction homes in Ontario. Please send me new project updates, price lists, and VIP incentives."
          siteName={settings.site_name}
        />

        <section className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
          <div className="border-t border-line pt-8">
            <h2 className="font-display text-lg font-bold">Pre-Construction Homes, Condos &amp; Townhomes in Ontario</h2>
            <p className="mt-3 max-w-4xl text-sm leading-relaxed text-muted">
              GetSetSold tracks pre-construction projects across Ontario — from townhomes and detached homes to condos —
              with VIP pricing, floor plans, and builder incentives. Browse projects by city or builder, compare models
              side by side, and register for alerts so you hear about new releases before the public launch.
            </p>
          </div>
        </div>
</section>
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
