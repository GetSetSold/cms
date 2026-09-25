import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSettings, getSvgs, getLogo } from "@/lib/cms";
import { getCategories, getCategoryBySlug, getPosts } from "@/lib/blog";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { Svg } from "@/components/site/Svg";

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
          <div className="text-sm text-muted"><Link href="/" className="hover:text-ink">Home</Link> / <Link href="/updates" className="hover:text-ink">Updates</Link> / {category.name}</div>
          <h1 className="font-display text-4xl font-extrabold md:text-5xl">{category.name}</h1>
          {category.description ? <p className="max-w-xl text-lg text-muted">{category.description}</p> : null}
        </div>

        <div className="mb-10 flex flex-wrap gap-2.5">
          <Link href="/updates" className="flex h-10 items-center rounded-full border border-line bg-white px-4.5 text-sm">All posts</Link>
          {categories.map((c) => (
            <Link key={c.id} href={`/updates/${c.slug}`} className={`flex h-10 items-center rounded-full px-4.5 text-sm ${c.slug === slug ? "bg-primary font-semibold text-white" : "border border-line bg-white"}`}>{c.name}</Link>
          ))}
        </div>

        {posts.length ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p: any) => (
              <Link key={p.id} href={`/updates/${slug}/${p.slug}`} prefetch={false} className="flex flex-col gap-3 overflow-hidden rounded-2xl bg-white shadow-[0_4px_16px_rgba(20,20,43,0.05)]">
                <Svg asset={p.cover_svg_id ? svgs[p.cover_svg_id] : undefined} className="aspect-[16/10]" />
                <div className="flex flex-col gap-2 px-5 pb-5">
                  <h3 className="text-lg font-bold leading-snug">{p.title}</h3>
                  {p.excerpt ? <p className="line-clamp-2 text-[13px] text-muted">{p.excerpt}</p> : null}
                </div>
              </Link>
            ))}
          </div>
        ) : <p className="text-muted">No posts in this category yet.</p>}
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
