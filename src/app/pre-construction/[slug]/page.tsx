import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSettings, getLogo } from "@/lib/cms";
import { getBuilder, getProjectsByCitySlug, getCities, getPreconStats } from "@/lib/precon";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { PointsMap } from "@/components/site/PointsMap";
import { LeadForm } from "@/components/blocks/LeadForm";
import { getCashbackAmount, formatCashback } from "@/lib/cashback";
import { PreconSectionHeader } from "@/components/site/PreconSectionHeader";
import { PromoBanner } from "@/components/site/PromoBanner";
import { CardArrowButton } from "@/components/site/CardArrowButton";
import { IconHome, IconBuilding, IconCheckBadge, IconPin, IconClock, IconCalendar, IconFile, IconLock } from "@/components/site/PreconIcons";

const wrap = "mx-auto w-full max-w-7xl px-5 md:px-10";
const card = "rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line shadow-[var(--shadow-card)] bg-white";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const builder = await getBuilder(slug);
  if (builder) return { title: `Pre-Construction Homes by ${builder.builder.builder_name} | Ontario` };
  const projects = await getProjectsByCitySlug(slug);
  if (projects.length) return { title: `Pre-Construction Homes & Condos in ${slug.replace(/-/g, " ")} | Ontario` };
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
          <div className={`${wrap} pb-4 pt-6 text-sm text-muted`}>
            <Link href="/pre-construction" prefetch={false}>Pre-Construction</Link> › {builder.builder_name}
          </div>
          <section
            className="relative flex min-h-[50vh] flex-col justify-end overflow-hidden bg-ink bg-cover bg-center"
            style={builder.banner_url ? { backgroundImage: `url(${builder.banner_url})` } : undefined}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />
            <div className={`${wrap} relative z-10 flex flex-col items-start gap-4 py-12`}>
              {builder.logo_url ? (
                <span className="flex h-16 w-40 items-center justify-center rounded-lg bg-white/95 p-3">
                  <img src={builder.logo_url} alt={builder.builder_name} className="max-h-full max-w-full object-contain" />
                </span>
              ) : null}
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary">Pre-Construction Builder</span>
              <h1 className="font-display text-2xl font-extrabold text-white md:text-5xl">{builder.builder_name}</h1>
              {builder.description ? <p className="max-w-xl text-sm text-white/65 md:text-base">{builder.description}</p> : null}
              <div className="flex gap-3 pt-2">
                <a href="#lead" className="flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-white md:h-13 md:px-7 md:text-base">Register Interest</a>
                <a href="#projects" className="flex h-11 items-center rounded-full border border-white/50 px-6 text-sm font-medium text-white md:h-13 md:px-7 md:text-base">View Projects</a>
              </div>
            </div>
          </section>

          <section className={`${wrap} flex flex-col gap-10 py-14`}>
            <PreconSectionHeader eyebrow="The Builder" heading={builder.builder_name} />
            <div className="grid grid-cols-1 gap-10 md:grid-cols-[1fr_360px]">
              <div className="flex flex-col gap-6">
                {builder.description ? <p className="text-sm leading-relaxed md:text-base">{builder.description}</p> : null}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {[[IconHome, projects.length, "Active Projects"], [IconBuilding, cities.size, "Communities"], [IconCheckBadge, "Ontario", "Coverage Area"]].map(([Icon, value, label]: any) => (
                    <div key={label} className="flex items-center gap-3 rounded-lg bg-soft p-4">
                      <Icon className="h-6 w-6 shrink-0" />
                      <div><div className="text-sm font-bold">{value}</div><div className="text-xs text-muted">{label}</div></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-5 self-start rounded-[var(--radius-lg)] bg-ink p-7 text-white">
                {builder.logo_url ? (
                  <span className="flex h-14 items-center justify-center rounded-lg bg-white/95 p-2.5">
                    <img src={builder.logo_url} alt={builder.builder_name} className="max-h-full max-w-full object-contain" />
                  </span>
                ) : null}
                <div><h3 className="font-display text-lg font-bold">{builder.builder_name}</h3><p className="text-xs text-white/60">Pre-Construction Specialist · Ontario</p></div>
                <div><div className="font-display text-2xl font-bold text-primary">{projects.length}</div><div className="text-[11px] uppercase tracking-wide text-white/40">Active Projects</div></div>
                <a href="#projects" className="flex h-12 items-center justify-center rounded-lg bg-primary text-sm font-bold">Browse Projects</a>
                <a href="#lead" className="flex h-12 items-center justify-center rounded-lg border border-white/30 text-sm font-bold">Request Info Package</a>
              </div>
            </div>
          </section>

          {promos.length ? (
            <section className={`${wrap} flex flex-col gap-6 pb-14`}>
              <PreconSectionHeader eyebrow="Incentives" heading="Current Builder Incentives" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                {promos.map((promo) => (
                  <div key={promo.id} className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-line bg-white p-5 pl-6" style={{ borderLeftWidth: 4, borderLeftColor: "var(--color-primary)" }}>
                    {promo.badge ? <span className="w-fit rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">{promo.badge}</span> : null}
                    <strong className="text-sm">{promo.title}</strong>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {limitedTimePromo ? (
            <section className={`${wrap} pb-14`}>
              <PromoBanner promo={limitedTimePromo} />
            </section>
          ) : null}

          <section id="projects" className="bg-ink py-14">
            <div className={`${wrap} flex flex-col gap-6`}>
              <PreconSectionHeader eyebrow="Portfolio" heading="Active Projects" dark />
              {projects.length ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {projects.map((p) => {
                    const cb = getCashbackAmount(p.p_start_price, settings.precon_cashback);
                    return (
                      <Link key={p.id} href={`/pre-construction/${slug}/${p.slug}`} prefetch={false} className={`group flex flex-col overflow-hidden ${card}`}>
                        <div className="relative aspect-[4/3] bg-soft">
                          {p.main_image_url ? <img src={p.main_image_url} alt={p.project_name} className="h-full w-full object-cover" /> : null}
                          {p.project_status ? <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-white">{p.project_status}</span> : null}
                          {p.vip_release === "Yes" ? <span className="absolute right-3 top-3 rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-semibold text-white">VIP Access</span> : null}
                          {cb ? <span className="absolute right-3 top-11 flex items-center gap-1 rounded-full bg-gradient-to-r from-[#065f46] to-[#059669] px-2.5 py-1 text-[11px] font-semibold text-white">{formatCashback(cb)} cashback</span> : null}
                          <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-sm font-bold">{p.p_start_price ? `From $${Number(p.p_start_price).toLocaleString()}` : "Price TBA"}</span>
                          <CardArrowButton />
                        </div>
                        <div className="flex flex-col gap-2 p-4">
                          <div className="font-display text-lg font-bold">{p.project_name}</div>
                          <div className="flex items-center gap-1 text-xs text-muted"><IconPin className="h-3.5 w-3.5" /> {p.city}, ON</div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {p.beds ? <span className="rounded-md bg-soft px-2 py-1 text-xs font-semibold">{p.beds} Beds</span> : null}
                            {p.baths ? <span className="rounded-md bg-soft px-2 py-1 text-xs font-semibold">{p.baths} Baths</span> : null}
                            {p.sqft ? <span className="rounded-md bg-soft px-2 py-1 text-xs font-semibold">{p.sqft} Sqft</span> : null}
                          </div>
                          <span className="mt-1 flex h-11 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">View Project →</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : <p className="text-white/60">No active projects at this time.</p>}
            </div>
          </section>

          {points.length ? (
            <section className="bg-[#1e293b] pb-14 pt-2">
              <div className={`${wrap} flex flex-col gap-6`}>
                <PreconSectionHeader eyebrow="Locations" heading="Building Across Ontario" dark />
                <div className="grid grid-cols-1 gap-0 overflow-hidden rounded-[var(--radius-lg)] md:grid-cols-[1fr_320px]">
                  <div className="h-72 md:h-[420px]"><PointsMap points={points} /></div>
                  <div className="flex flex-col gap-4 bg-[#0f172a] p-6 text-white">
                    <h3 className="font-display text-lg font-bold">{builder.builder_name}</h3>
                    <p className="text-sm text-white/50">Explore all active and upcoming communities across Ontario. Click any pin for project details.</p>
                    <div className="flex flex-col divide-y divide-white/10">
                      <div className="py-3"><div className="font-display text-xl font-bold text-primary">{projects.length}</div><div className="text-[10px] uppercase tracking-wide text-white/40">Projects on Map</div></div>
                      <div className="py-3"><div className="font-display text-xl font-bold text-primary">{cities.size}</div><div className="text-[10px] uppercase tracking-wide text-white/40">Cities</div></div>
                    </div>
                    <a href="#lead" className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold">Find My Community</a>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <section id="lead" className={`${wrap} pb-16 pt-14`}>
            <PreconSectionHeader eyebrow="Get In Touch" heading="Interested in a New Home?" />
            <div className="grid gap-10 pt-10 md:grid-cols-2 md:gap-16">
              <div className="flex flex-col gap-5">
                <h3 className="font-display text-xl font-bold md:text-2xl">Let's Find Your Perfect Home</h3>
                <p className="text-sm text-muted md:text-base">Our team is ready to connect you with the right project, floor plan, and payment plan to match your lifestyle and budget.</p>
                {[
                  [IconClock, "Fast Response", "We respond to all inquiries within 24 hours."],
                  [IconCalendar, "Private Showings", "Book a private tour at a time that works for you."],
                  [IconFile, "Full Brochure", "Get pricing, floor plans, and availability packages."],
                  [IconLock, "No Obligation", "Your information stays private. No pressure, ever."],
                ].map(([Icon, title, desc]: any) => (
                  <div key={title} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-soft"><Icon className="h-4 w-4" /></span>
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
        <div className={`${wrap} pb-4 pt-6 text-sm text-muted`}>
          <Link href="/pre-construction" prefetch={false}>Pre-Construction</Link> › {cityName}
        </div>
        <section className={`${wrap} flex flex-col items-start gap-4 pb-8`}>
          <h1 className="font-display text-2xl font-extrabold md:text-5xl">Pre-Construction Homes & Condos in {cityName}</h1>
          <p className="max-w-xl text-sm text-muted md:text-lg">Explore the latest pre-construction communities in {cityName} with VIP pricing, exclusive floor plans, and builder incentives.</p>
          <div className="flex gap-3 pt-1">
            <a href="#projects" className="flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-white md:h-13 md:px-7">View Projects</a>
            <a href="#lead" className="flex h-11 items-center rounded-full border border-ink px-6 text-sm font-medium md:h-13 md:px-7">Register for VIP Access</a>
          </div>
        </section>
        <section className={`${wrap} pb-10`}>
          <div className={`grid grid-cols-2 gap-4 p-5 sm:grid-cols-4 md:p-8 ${card}`}>
            <div className="flex flex-col gap-0.5"><span className="text-lg font-bold md:text-2xl">{projects.length}</span><span className="text-[11px] text-muted md:text-xs">Projects</span></div>
            <div className="flex flex-col gap-0.5"><span className="text-lg font-bold md:text-2xl">{builders.length}</span><span className="text-[11px] text-muted md:text-xs">Builders</span></div>
            <div className="flex flex-col gap-0.5"><span className="text-lg font-bold md:text-2xl">{fromPrice}</span><span className="text-[11px] text-muted md:text-xs">Starting From</span></div>
          </div>
        </section>
        <section id="projects" className={`${wrap} flex flex-col gap-5 pb-14`}>
          <h2 className="text-xl font-extrabold md:text-3xl">Pre-Construction Projects in {cityName}</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const cb = getCashbackAmount(p.p_start_price, settings.precon_cashback);
              return (
                <Link key={p.id} href={`/pre-construction/${p.builder.slug}/${p.slug}`} prefetch={false} className={`group flex flex-col overflow-hidden ${card}`}>
                  <div className="relative aspect-[4/3] bg-soft">
                    {p.main_image_url ? <img src={p.main_image_url} alt={p.project_name} className="h-full w-full object-cover" /> : null}
                    {p.project_status ? <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-white">{p.project_status}</span> : null}
                    {cb ? <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-gradient-to-r from-[#065f46] to-[#059669] px-2.5 py-1 text-[11px] font-semibold text-white">{formatCashback(cb)} cashback</span> : null}
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
        </section>
        {points.length ? (
          <section className={`${wrap} flex flex-col gap-5 pb-14`}>
            <h2 className="text-xl font-extrabold md:text-3xl">Project Locations in {cityName}</h2>
            <div className="h-80 overflow-hidden rounded-[var(--radius-lg)] md:h-[420px]"><PointsMap points={points} /></div>
          </section>
        ) : null}
        {builders.length ? (
          <section className={`${wrap} flex flex-col gap-5 pb-14`}>
            <h2 className="text-xl font-extrabold md:text-3xl">Builders in {cityName}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {builders.map(({ builder: b, count }) => (
                <Link key={b.id} href={`/pre-construction/${b.slug}`} prefetch={false} className={`flex flex-col items-center gap-2 p-4 text-center ${card}`}>
                  {b.logo_url ? <img src={b.logo_url} alt={b.builder_name} className="h-8 w-auto object-contain" /> : <span className="font-bold">{b.builder_name}</span>}
                  <span className="text-xs text-muted">{count} project{count === 1 ? "" : "s"}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
        {otherCities.length ? (
          <section className={`${wrap} flex flex-col gap-5 pb-14`}>
            <h2 className="text-xl font-extrabold md:text-3xl">Browse Other Cities</h2>
            <div className="flex flex-wrap gap-2">
              {otherCities.map((c) => (
                <Link key={c.city} href={`/pre-construction/${c.city.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} prefetch={false}
                  className="flex h-9 items-center rounded-full border border-line bg-white px-4 text-sm font-medium">
                  {c.city} ({c.count})
                </Link>
              ))}
            </div>
          </section>
        ) : null}
        <section id="lead" className={`${wrap} grid gap-6 pb-16 md:grid-cols-2 md:gap-12`}>
          <div className="flex flex-col gap-3">
            <h2 className="text-xl font-extrabold md:text-3xl">Get Priority Access to New Releases</h2>
            <p className="text-sm text-muted md:text-lg">Register to receive first access to new projects, VIP pricing, and exclusive incentives in {cityName}.</p>
          </div>
          <LeadForm data={{ form_key: "precon", heading: "", submit_label: "Get Info" }} siteName={settings.site_name} />
        </section>
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
