import type { Metadata } from "next";
import Link from "next/link";
import { getSettings, getSvgs } from "@/lib/cms";
import { getCategories, getPosts } from "@/lib/blog";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { Svg } from "@/components/site/Svg";
import { BlogCardArt } from "@/components/blog/BlogCardArt";
import { getLogo } from "@/lib/cms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Updates",
  description: "Buying, selling, and market insights.",
  alternates: { canonical: "/updates" },
};

/** Prettify a market slug for the card placeholder: "hamilton-burlington" -> "Hamilton–Burlington". */
function marketNameFromSlug(slug: string): string {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("–");
}

/** Find the first market_stats block's market slug in a post's block lists. */
function marketSlugForPost(p: any): string | null {
  for (const list of [p.blocks_before, p.blocks_after].filter(Array.isArray)) {
    for (const b of list) {
      const slug = b?.data?.market_slug;
      if ((b?.block_type === "market_stats" || b?.type === "market_stats") && slug) return slug;
    }
  }
  return null;
}

function monthYear(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-CA", { month: "long", year: "numeric" });
}

export default async function UpdatesLanding() {
  const [settings, categories, posts] = await Promise.all([getSettings(), getCategories(), getPosts({ limit: 25 })]);
  const logo = await getLogo(settings);
  const themeVars_ = themeVars(settings);

  const svgIds = new Set<string>();
  posts.forEach((p: any) => p.cover_svg_id && svgIds.add(p.cover_svg_id));
  const svgs = await getSvgs(svgIds);

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

        {/* Segmented category control */}
        <div className="mb-10 overflow-x-auto">
          <div className="inline-flex min-w-full items-center gap-1 rounded-[var(--radius-btn)] border border-line bg-white p-1.5 sm:min-w-0">
            <Link href="/updates" className="whitespace-nowrap rounded-[var(--radius-btn)] bg-ink px-4 py-2 text-sm font-semibold text-white">All posts</Link>
            {categories.map((c) => (
              <Link key={c.id} href={`/updates/${c.slug}`} className="whitespace-nowrap rounded-[var(--radius-btn)] px-4 py-2 text-sm font-medium text-muted hover:text-ink">{c.name}</Link>
            ))}
          </div>
        </div>

        {posts.length ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {posts.map((p: any) => {
              const catSlug = p.blog_categories?.slug ?? "post";
              const catName = p.blog_categories?.name ?? "";
              const mSlug = marketSlugForPost(p);
              const marketLabel = mSlug ? `${marketNameFromSlug(mSlug)} · ${monthYear(p.publish_at)}` : undefined;
              return (
                <Link key={p.id} href={`/updates/${catSlug}/${p.slug}`} prefetch={false} className="group flex flex-col overflow-hidden rounded-[var(--radius-lg)] bg-white shadow-[var(--shadow-card)]">
                  {p.cover_svg_id && svgs[p.cover_svg_id] ? (
                    <Svg asset={svgs[p.cover_svg_id]} fill className="aspect-[16/10] w-full overflow-hidden" />
                  ) : (
                    <BlogCardArt categorySlug={catSlug} categoryName={catName || "Update"} title={p.title} marketLabel={marketLabel} />
                  )}
                  <div className="flex flex-1 flex-col gap-2 bg-white px-5 pb-5 pt-4">
                    {catName ? <span className="text-[11px] font-bold uppercase tracking-wide text-primary">{catName}</span> : null}
                    <h3 className="text-lg font-bold leading-snug group-hover:text-primary">{p.title}</h3>
                    {p.excerpt ? <p className="line-clamp-2 text-[13px] text-muted">{p.excerpt}</p> : null}
                    <span className="mt-auto pt-3">
                      <span className="inline-flex items-center gap-1 rounded-[var(--radius-btn)] border border-line px-4 py-2 text-sm font-semibold text-ink transition-colors group-hover:border-ink group-hover:bg-ink group-hover:text-white">
                        Read More
                        <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : <p className="text-muted">No posts yet.</p>}
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
