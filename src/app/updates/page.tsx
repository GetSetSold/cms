import type { Metadata } from "next";
import Link from "next/link";
import { getSettings, getSvgs } from "@/lib/cms";
import { getCategories, getPosts } from "@/lib/blog";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { CategorySegmentedControl } from "@/components/blog/CategorySegmentedControl";
import { BlogCard } from "@/components/blog/BlogCard";
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

        <CategorySegmentedControl categories={categories} activeSlug="all" />

        {posts.length ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {posts.map((p: any) => <BlogCard key={p.id} post={p} svgs={svgs} />)}
          </div>
        ) : <p className="text-muted">No posts yet.</p>}
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
