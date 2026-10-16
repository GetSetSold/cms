import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSettings, getSvgs, getLogo } from "@/lib/cms";
import { getCategories, getCategoryBySlug, getPosts } from "@/lib/blog";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { CategorySegmentedControl } from "@/components/blog/CategorySegmentedControl";
import { BlogCard } from "@/components/blog/BlogCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const cat = await getCategoryBySlug(category);
  if (!cat) return { title: "Not found" };
  return {
    title: `${cat.name} — Updates`,
    description: cat.description ?? `Posts about ${cat.name.toLowerCase()}.`,
    alternates: { canonical: `/updates/${cat.slug}` },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const [settings, categories, posts] = await Promise.all([getSettings(), getCategories(), getPosts({ categoryId: category.id, limit: 25 })]);
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
          <nav className="py-3 text-[13px] text-muted" aria-label="Breadcrumb"><Link href="/">Home</Link> / <Link href="/updates">Updates</Link> / {category.name}</nav>
          <h1 className="font-display font-bold text-[30px] leading-[1.15] tracking-tight md:text-[28px] md:leading-[1.2]">{category.name}</h1>
          {category.description ? <p className="max-w-xl text-lg text-muted">{category.description}</p> : null}
        </div>

        <CategorySegmentedControl categories={categories} activeSlug={slug} />

        {posts.length ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {posts.map((p: any) => <BlogCard key={p.id} post={p} svgs={svgs} />)}
          </div>
        ) : <p className="text-muted">No posts in this category yet.</p>}
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
