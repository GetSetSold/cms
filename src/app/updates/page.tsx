import type { Metadata } from "next";
import Link from "next/link";
import { getSettings, getSvgs } from "@/lib/cms";
import { getCategories, getPosts } from "@/lib/blog";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { Svg } from "@/components/site/Svg";
import { getLogo } from "@/lib/cms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Updates",
  description: "Buying, selling, and market insights.",
  alternates: { canonical: "/updates" },
};

export default async function UpdatesLanding() {
  const [settings, categories, posts] = await Promise.all([getSettings(), getCategories(), getPosts({ limit: 25 })]);
  const logo = await getLogo(settings);
  const themeVars_ = themeVars(settings);

  const svgIds = new Set<string>();
  posts.forEach((p: any) => p.cover_svg_id && svgIds.add(p.cover_svg_id));
  const svgs = await getSvgs(svgIds);

  const [featured, ...rest] = posts;

  return (
    <div style={themeVars_} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      <SiteHeader settings={settings} logo={logo} />
      <main className="mx-auto w-full max-w-7xl px-5 py-14 md:px-10">
        <div className="mb-8 flex flex-col gap-3">
          <nav className="py-3 text-[13px] text-muted" aria-label="Breadcrumb"><Link href="/">Home</Link> / Updates</nav>
          <h1 className="font-display font-bold text-[30px] leading-[1.15] tracking-tight md:text-[28px] md:leading-[1.2]">Insights &amp; Updates</h1>
          <p className="max-w-xl text-lg text-muted">Practical advice on buying, selling, and everything in between.</p>
        </div>

        <div className="mb-10 flex flex-wrap gap-2.5">
          <Link href="/updates" className="flex h-10 items-center rounded-[var(--radius-btn)] bg-primary px-4.5 text-sm font-semibold text-white">All posts</Link>
          {categories.map((c) => (
            <Link key={c.id} href={`/updates/${c.slug}`} className="flex h-10 items-center rounded-[var(--radius-btn)] border border-line bg-white px-4.5 text-sm">{c.name}</Link>
          ))}
        </div>

        {featured ? (
          <Link href={`/updates/${(featured as any).blog_categories?.slug ?? "post"}/${featured.slug}`} prefetch={false}
            className="mb-14 grid gap-10 rounded-[var(--radius-lg)] bg-white p-7 shadow-[var(--shadow-card)] md:grid-cols-2 md:items-center md:p-8">
            <Svg asset={featured.cover_svg_id ? svgs[featured.cover_svg_id] : undefined} fill className="aspect-[16/11] overflow-hidden rounded-[var(--radius-lg)]" />
            <div className="flex flex-col gap-3.5">
              <span className="w-fit rounded-[var(--radius-label)] bg-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">Featured{(featured as any).blog_categories ? ` · ${(featured as any).blog_categories.name}` : ""}</span>
              <h2 className="font-display text-2xl font-extrabold leading-tight md:text-3xl">{featured.title}</h2>
              {featured.excerpt ? <p className="text-muted">{featured.excerpt}</p> : null}
              <div className="flex items-center gap-2 text-sm text-muted">
                {featured.author_name ? <span className="font-medium text-ink">{featured.author_name}</span> : null}
                {featured.publish_at ? <span>· {new Date(featured.publish_at).toLocaleDateString()}</span> : null}
              </div>
            </div>
          </Link>
        ) : null}

        {rest.length ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {rest.map((p: any) => (
              <Link key={p.id} href={`/updates/${p.blog_categories?.slug ?? "post"}/${p.slug}`} prefetch={false} className="group flex flex-col overflow-hidden rounded-[var(--radius-lg)] bg-white shadow-[var(--shadow-card)]">
                <Svg asset={p.cover_svg_id ? svgs[p.cover_svg_id] : undefined} fill className="aspect-[16/10] w-full overflow-hidden" />
                <div className="flex flex-1 flex-col gap-2 px-5 pb-5 pt-4">
                  {p.blog_categories?.name ? <span className="text-[11px] font-bold uppercase tracking-wide text-primary">{p.blog_categories.name}</span> : null}
                  <h3 className="text-lg font-bold leading-snug group-hover:text-primary">{p.title}</h3>
                  {p.excerpt ? <p className="line-clamp-2 text-[13px] text-muted">{p.excerpt}</p> : null}
                  <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-semibold text-primary">
                    Read More
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : !featured ? <p className="text-muted">No posts yet.</p> : null}
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
