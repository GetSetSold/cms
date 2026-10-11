import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSettings, getLogo } from "@/lib/cms";
import { getBuilder, getProjectsByCitySlug, getCities, getPreconStats } from "@/lib/precon";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { PointsMap } from "@/components/site/PointsMap";
import { getCashbackAmount, formatCashback } from "@/lib/cashback";
import { PreconSectionHeader } from "@/components/site/PreconSectionHeader";
import { PreconLeadSection } from "@/components/site/PreconLeadSection";
import { PreconBoxHeader } from "@/components/site/PreconBoxHeader";
import { PreconCardCta } from "@/components/site/PreconCardCta";
import { CardArrowButton } from "@/components/site/CardArrowButton";
import { PromoBanner } from "@/components/site/PromoBanner";
import { IconHome, IconBuilding, IconCheckBadge, IconPin } from "@/components/site/PreconIcons";
import { seoTitle } from "@/lib/seo";

const wrap = "mx-auto w-full max-w-7xl px-5 md:px-10";
const card = "rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line shadow-[var(--shadow-card)] bg-white";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const builder = await getBuilder(slug);
  if (builder) {
    const title = await seoTitle(`Pre-Construction Homes by ${builder.builder.builder_name}`);
    const description = `Explore pre-construction projects by ${builder.builder.builder_name} — floor plans, pricing, and VIP buyer incentives.`;
    const url = `https://www.getsetsold.ca/pre-construction/${slug}`;
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: { title, description, type: "website", url },
      twitter: { card: "summary_large_image", title, description },
    };
  }
  const projects = await getProjectsByCitySlug(slug);
  if (projects.length) {
    const cityName = slug.replace(/-/g, " ");
    const title = await seoTitle(`Pre-Construction Homes & Condos in ${cityName}`);
    const description = `Browse pre-construction projects in ${cityName}, Ontario — floor plans, pricing, and VIP incentives.`;
    const url = `https://www.getsetsold.ca/pre-construction/${slug}`;
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: { title, description, type: "website", url },
      twitter: { card: "summary_large_image", title, description },
    };
  }
  return {};
}

export default async function BuilderOrCityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const settings = await getSettings();
  const logo = await getLogo(settings);

  // Try builder first — matches the reference site's own resolution order,
  // since builder and city slugs share the same URL level.
  const found = await getBuilder(slug);
  if (found) {
    const { builder, projects, promos, limitedTimePromo } = found;
    const cities = new Set(projects.map((p) => p.city).filter(Boolean));
    const points = projects.filter((p) => p.lat && p.lng).map((p) => ({ lat: p.lat!, lng: p.lng!, label: p.project_name, href: `/pre-construction/${slug}/${p.slug}` }));
    return (
      <div style={themeVars(settings)} className="bg-ground text-ink">
        <link rel="stylesheet" href={themeFontHref(settings)} />
        {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
        <SiteHeader settings={settings} logo={logo} />
        <main>
          <PreconBoxHeader
            crumbs={[
              { label: "Pre-Construction", href: "/pre-construction" },
              { label: "Builders", href: "/builder" },
              { label: builder.builder_name },
            ]}
            eyebrow="Pre-Construction Builder · Ontario"
            title={builder.builder_name}
            lede={builder.description}
            bgImage={builder.banner_url}
            logoUrl={builder.logo_url}
            logoAlt={builder.builder_name}
            facts={[
              { value: String(projects.length), label: "Active Projects" },
              { value: String(cities.size), label: "Communities" },
              { value: "Ontario", label: "Coverage Area" },
            ]}
            ctas={[
              { label: "Register Interest", href: "#lead", variant: "primary" },
              { label: "View Projects", href: "#projects", variant: "ghost" },
            ]}
          />

          <section className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
            <PreconSectionHeader eyebrow="The Builder" heading={builder.builder_name} />
            {builder.description ? <p className="max-w-3xl text-sm leading-relaxed md:text-base">{builder.description}</p> : null}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[[IconHome, projects.length, "Active Projects"], [IconBuilding, cities.size, "Communities"], [IconCheckBadge, "Ontario", "Coverage Area"]].map(([Icon, value, label]: any) => (
                <div key={label} className="flex items-center gap-3 rounded-[var(--radius-md)] bg-soft p-4">
                  <Icon className="h-6 w-6 shrink-0" />
                  <div><div className="text-sm font-bold">{value}</div><div className="text-xs text-muted">{label}</div></div>
                </div>
              ))}
            </div>
          </div>
</section>

          {promos.length ? (
            <section className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
              <PreconSectionHeader eyebrow="Incentives" heading="Current Builder Incentives" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                {promos.map((promo) => (
                  <div key={promo.id} className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-line bg-white p-5 pl-6" style={{ borderLeftWidth: 4, borderLeftColor: "var(--color-primary)" }}>
                    {promo.badge ? <span className="w-fit rounded-[var(--radius-label)] bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">{promo.badge}</span> : null}
                    <strong className="text-sm">{promo.title}</strong>
                  </div>
                ))}
              </div>
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

          <section id="projects" className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
            <PreconSectionHeader eyebrow="Portfolio" heading="Active Projects" />
            {projects.length ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((p) => {
                  const cb = getCashbackAmount(p.p_start_price, settings.precon_cashback);
                  return (
                    <Link key={p.id} href={`/pre-construction/${slug}/${p.slug}`} prefetch={false} className={`group flex flex-col overflow-hidden ${card}`}>
                      <div className="relative aspect-[4/3] bg-soft">
                        {p.main_image_url ? <img src={p.main_image_url} alt={p.project_name} className="h-full w-full object-cover" /> : null}
                        {p.project_status ? <span className="absolute left-3 top-3 rounded-[var(--radius-label)] bg-primary px-2.5 py-1 text-[11px] font-semibold text-white">{p.project_status}</span> : null}
                        {p.vip_release === "Yes" ? <span className="absolute right-3 top-3 rounded-[var(--radius-label)] bg-amber-500 px-2.5 py-1 text-[11px] font-semibold text-white">VIP Access</span> : null}
                        {cb ? <span className="absolute right-3 top-11 flex items-center gap-1 rounded-[var(--radius-label)] bg-gradient-to-r from-[#065f46] to-[#059669] px-2.5 py-1 text-[11px] font-semibold text-white">{formatCashback(cb)} cashback</span> : null}
                        <span className="absolute bottom-3 left-3 rounded-[var(--radius-label)] bg-white/95 px-3 py-1.5 text-sm font-bold">{p.p_start_price ? `From $${Number(p.p_start_price).toLocaleString()}` : "Price TBA"}</span>
                      </div>
                      <div className="flex flex-col gap-2 p-4">
                        <div className="font-display text-lg font-bold">{p.project_name}</div>
                        <div className="flex items-center gap-1 text-xs text-muted"><IconPin className="h-3.5 w-3.5" /> {p.city}, ON</div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {p.beds ? <span className="rounded-md bg-soft px-2 py-1 text-xs font-semibold">{p.beds} Beds</span> : null}
                          {p.baths ? <span className="rounded-md bg-soft px-2 py-1 text-xs font-semibold">{p.baths} Baths</span> : null}
                          {p.sqft ? <span className="rounded-md bg-soft px-2 py-1 text-xs font-semibold">{p.sqft} Sqft</span> : null}
                        </div>
                        <PreconCardCta label="View Project" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : <p className="text-muted">No active projects at this time.</p>}
          </div>
</section>

          {points.length ? (
            <section className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
              <PreconSectionHeader eyebrow="Locations" heading="Building Across Ontario" />
              <div className={`grid grid-cols-1 gap-0 overflow-hidden md:grid-cols-[1fr_320px] ${card}`}>
                <div className="h-72 md:h-[420px]"><PointsMap points={points} /></div>
                <div className="flex flex-col gap-4 bg-white p-6">
                  <h3 className="font-display text-lg font-bold">{builder.builder_name}</h3>
                  <p className="text-sm text-muted">Explore all active and upcoming communities across Ontario. Click any pin for project details.</p>
                  <div className="flex flex-col divide-y divide-line">
                    <div className="py-3"><div className="font-display text-xl font-bold text-primary">{projects.length}</div><div className="text-[10px] uppercase tracking-wide text-muted">Projects on Map</div></div>
                    <div className="py-3"><div className="font-display text-xl font-bold text-primary">{cities.size}</div><div className="text-[10px] uppercase tracking-wide text-muted">Cities</div></div>
                  </div>
                  <a href="#lead" className="flex h-11 items-center justify-center gap-2 rounded-[var(--radius-btn)] bg-primary text-sm font-bold text-white">Find My Community</a>
                </div>
              </div>
            </div>
</section>
          ) : null}

          <PreconLeadSection
            heading="Interested in a New Home?"
            defaultMessage={`Hi, I'm interested in a new home by ${builder.builder_name}. Please send me project details, floor plans, and pricing.`}
            siteName={settings.site_name}
          />
        </main>
        <SiteFooter settings={settings} />
        <MobileCtaBar settings={settings} />
      </div>
    );
  }
  // Not a builder — try city.
  const projects = await getProjectsByCitySlug(slug);
  if (!projects.length) notFound();

  const cityName = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const allCities = await getCities();
  const otherCities = allCities.filter((c) => c.city.toLowerCase() !== cityName.toLowerCase());
  const buildersMap = new Map<number, { builder: (typeof projects)[number]["builder"]; count: number }>();
  for (const p of projects) { const e = buildersMap.get(p.builder.id); if (e) e.count++; else buildersMap.set(p.builder.id, { builder: p.builder, count: 1 }); }
  const builders = [...buildersMap.values()].sort((a, b) => b.count - a.count);
  const points = projects.filter((p) => p.lat && p.lng).map((p) => ({ lat: p.lat!, lng: p.lng!, label: p.project_name, href: `/pre-construction/${p.builder.slug}/${p.slug}` }));
  const prices = projects.map((p) => Number(p.p_start_price)).filter((n) => !isNaN(n) && n > 0);
  const fromPrice = prices.length ? `$${Math.min(...prices).toLocaleString()}` : "TBA";

  return (
    <div style={themeVars(settings)} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      <SiteHeader settings={settings} logo={logo} />
      <main>
        <PreconBoxHeader
          crumbs={[
            { label: "Pre-Construction", href: "/pre-construction" },
            { label: cityName },
          ]}
          eyebrow={`Pre-Construction · ${cityName}, Ontario`}
          title={`Pre-Construction Homes & Condos in ${cityName}`}
          lede={`Explore the latest pre-construction communities in ${cityName} with VIP pricing, exclusive floor plans, and builder incentives.`}
          bgImages={projects.map((p) => p.main_image_url)}
          facts={[
            { value: String(projects.length), label: "Projects" },
            { value: String(builders.length), label: "Builders" },
            { value: fromPrice, label: "Starting From" },
          ]}
          ctas={[
            { label: "View Projects", href: "#projects", variant: "primary" },
            { label: "Register for VIP Access", href: "#lead", variant: "ghost" },
          ]}
        />
        <section id="projects" className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
          <h2 className="text-xl font-extrabold md:text-3xl">Pre-Construction Projects in {cityName}</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const cb = getCashbackAmount(p.p_start_price, settings.precon_cashback);
              return (
                <Link key={p.id} href={`/pre-construction/${p.builder.slug}/${p.slug}`} prefetch={false} className={`group flex flex-col overflow-hidden ${card}`}>
                  <div className="relative aspect-[4/3] bg-soft">
                    {p.main_image_url ? <img src={p.main_image_url} alt={p.project_name} className="h-full w-full object-cover" /> : null}
                    {p.project_status ? <span className="absolute left-3 top-3 rounded-[var(--radius-label)] bg-primary px-2.5 py-1 text-[11px] font-semibold text-white">{p.project_status}</span> : null}
                    {cb ? <span className="absolute right-3 top-3 flex items-center gap-1 rounded-[var(--radius-label)] bg-gradient-to-r from-[#065f46] to-[#059669] px-2.5 py-1 text-[11px] font-semibold text-white">{formatCashback(cb)} cashback</span> : null}
                    <CardArrowButton />
                  </div>
                  <div className="flex flex-col gap-1 p-4">
                    <div className="text-base font-bold text-primary md:text-lg">{p.p_start_price ? `From $${Number(p.p_start_price).toLocaleString()}` : "Price TBA"}</div>
                    <div className="text-sm font-medium">{p.project_name}</div>
                    <div className="text-xs text-muted">{p.builder.builder_name}</div>
                  </div>
              </Link>
              );
            })}
          </div>
        </div>
</section>
        {points.length ? (
          <section className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
            <h2 className="text-xl font-extrabold md:text-3xl">Project Locations in {cityName}</h2>
            <div className="h-80 overflow-hidden rounded-[var(--radius-lg)] md:h-[420px]"><PointsMap points={points} /></div>
          </div>
</section>
        ) : null}
        {builders.length ? (
          <section className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
            <h2 className="text-xl font-extrabold md:text-3xl">Builders in {cityName}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {builders.map(({ builder: b, count }) => (
                <Link key={b.id} href={`/pre-construction/${b.slug}`} prefetch={false} className={`flex flex-col items-center gap-2 p-4 text-center ${card}`}>
                  {b.logo_url ? <img src={b.logo_url} alt={b.builder_name} className="h-8 w-auto object-contain" /> : <span className="font-bold">{b.builder_name}</span>}
                  <span className="text-xs text-muted">{count} project{count === 1 ? "" : "s"}</span>
                </Link>
              ))}
            </div>
          </div>
</section>
        ) : null}
        {otherCities.length ? (
          <section className="mt-[50px] border-t border-line">
<div className="mx-auto w-full max-w-7xl px-5 md:px-10 py-[50px]">
            <h2 className="text-xl font-extrabold md:text-3xl">Browse Other Cities</h2>
            <div className="flex flex-wrap gap-2">
              {otherCities.map((c) => (
                <Link key={c.city} href={`/pre-construction/${c.city.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} prefetch={false}
                  className="flex h-9 items-center rounded-[var(--radius-btn)] border border-line bg-white px-4 text-sm font-medium">
                  {c.city} ({c.count})
                </Link>
              ))}
            </div>
          </div>
</section>
        ) : null}
        <PreconLeadSection
          heading="Get Priority Access to New Releases"
          defaultMessage={`Hi, I'm interested in pre-construction homes in ${cityName}. Please send me new project updates, VIP pricing, and exclusive incentives.`}
          siteName={settings.site_name}
        />
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
