import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSettings, getSvgs, getLogo, collectSvgIds } from "@/lib/cms";
import { getPostBySlug, getPosts } from "@/lib/blog";
import { renderMarkdown, readingTime } from "@/lib/markdown";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { Svg } from "@/components/site/Svg";
import { RenderSections } from "@/components/blocks";
import type { Section } from "@/lib/types";

export const dynamic = "force-dynamic";

async function load(category: string, slug: string, preview: boolean) {
  return getPostBySlug(category, slug, preview);
}

export async function generateMetadata({ params, searchParams }: { params: Promise<{ category: string; slug: string }>; searchParams: Promise<{ preview?: string }> }): Promise<Metadata> {
  const { category, slug } = await params;
  const { preview } = await searchParams;
  const result = await load(category, slug, preview === "1");
  if (!result) return { title: "Not found" };
  const { post, category: cat } = result;
  const title = post.seo_title || post.title;
  const description = post.seo_description || post.excerpt || undefined;
  return {
    title, description,
    alternates: { canonical: `/updates/${cat.slug}/${post.slug}` },
    openGraph: { title, description, type: "article" },
  };
}

// Blocks stored on a post use the same shape as page_sections but have no
// `id`/`page_id` — give them one at render time so RenderSections works unmodified.
function toSections(blocks: { type: string; data?: any; settings?: any }[], prefix: string): Section[] {
  return blocks.map((b, i) => ({
    id: `${prefix}-${i}`, page_id: "", block_type: b.type, position: i,
    data: b.data ?? {}, settings: b.settings ?? {}, is_visible: true,
  }));
}

export default async function PostPage({ params, searchParams }: { params: Promise<{ category: string; slug: string }>; searchParams: Promise<{ preview?: string }> }) {
  const { category, slug } = await params;
  const { preview } = await searchParams;
  const result = await load(category, slug, preview === "1");
  if (!result) notFound();
  const { post, category: cat } = result;

  const settings = await getSettings();
  const logo = await getLogo(settings);
  const themeVars_ = themeVars(settings);

  const svgIds = collectSvgIds([...post.blocks_before, ...post.blocks_after]);
  if (post.cover_svg_id) svgIds.add(post.cover_svg_id);
  if (post.author_svg_id) svgIds.add(post.author_svg_id);
  const svgs = await getSvgs(svgIds);

  const related = (await getPosts({ categoryId: cat.id, limit: 4 })).filter((p: any) => p.id !== post.id).slice(0, 3);
  const relatedSvgIds = new Set<string>();
  related.forEach((p: any) => p.cover_svg_id && relatedSvgIds.add(p.cover_svg_id));
  const relatedSvgs = await getSvgs(relatedSvgIds);

  const ctx = { svgs, settings, page: undefined };
  const html = renderMarkdown(post.content_md);
  const minutes = readingTime(post.content_md);

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Article",
    headline: post.title,
    description: post.excerpt ?? undefined,
    datePublished: post.publish_at ?? post.created_at,
    dateModified: post.updated_at,
    author: post.author_name ? { "@type": "Person", name: post.author_name } : undefined,
  };

  return (
    <div style={themeVars_} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      {preview ? <div className="bg-accent px-4 py-2 text-center text-sm text-white">Preview — status: {post.status}</div> : null}
      <SiteHeader settings={settings} logo={logo} />

      <main>
        {post.blocks_before.length ? <RenderSections sections={toSections(post.blocks_before, "before")} ctx={ctx} /> : null}

        <article className="mx-auto w-full max-w-3xl px-5 py-10 md:px-10">
          <div className="mb-4 text-sm text-muted"><Link href="/" className="hover:text-ink">Home</Link> / <Link href="/updates" className="hover:text-ink">Updates</Link> / <Link href={`/updates/${cat.slug}`} className="hover:text-ink">{cat.name}</Link></div>

          <span className="mb-4 inline-block w-fit rounded-full bg-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">{cat.name}</span>
          <h1 className="mb-4 font-display text-3xl font-extrabold leading-tight md:text-5xl">{post.title}</h1>
          {post.excerpt ? <p className="mb-6 text-lg text-muted">{post.excerpt}</p> : null}

          <div className="mb-8 flex items-center gap-3 border-y border-line py-4 text-sm text-muted">
            {post.author_svg_id ? <Svg asset={svgs[post.author_svg_id]} className="h-11 w-11 shrink-0 overflow-hidden rounded-full" /> : <div className="h-11 w-11 shrink-0 rounded-full bg-soft" />}
            <div className="flex flex-col">
              {post.author_name ? <span className="font-semibold text-ink">{post.author_name}</span> : null}
              <span>{post.author_role ? `${post.author_role} · ` : ""}{post.publish_at ? new Date(post.publish_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : ""} · {minutes} min read</span>
            </div>
          </div>

          {post.cover_svg_id ? <Svg asset={svgs[post.cover_svg_id]} className="mb-8 aspect-[16/9] overflow-hidden rounded-2xl" /> : null}

          <div className="prose-post" dangerouslySetInnerHTML={{ __html: html }} />

          {post.author_bio ? (
            <div className="mt-10 flex gap-4 border-y border-line py-6">
              {post.author_svg_id ? <Svg asset={svgs[post.author_svg_id]} className="h-14 w-14 shrink-0 overflow-hidden rounded-full" /> : <div className="h-14 w-14 shrink-0 rounded-full bg-soft" />}
              <div className="flex flex-col gap-1">
                {post.author_name ? <span className="font-semibold">Written by {post.author_name}</span> : null}
                <span className="text-sm leading-relaxed text-muted">{post.author_bio}</span>
              </div>
            </div>
          ) : null}
        </article>

        {post.blocks_after.length ? <RenderSections sections={toSections(post.blocks_after, "after")} ctx={ctx} /> : null}

        {related.length ? (
          <div className="mx-auto w-full max-w-3xl px-5 py-12 md:px-10">
            <h2 className="mb-5 text-xl font-extrabold">Related reading</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {related.map((p: any) => (
                <Link key={p.id} href={`/updates/${cat.slug}/${p.slug}`} prefetch={false} className="flex flex-col gap-2.5">
                  <Svg asset={p.cover_svg_id ? relatedSvgs[p.cover_svg_id] : undefined} className="aspect-[16/10] overflow-hidden rounded-xl" />
                  <span className="text-sm font-bold leading-snug">{p.title}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </main>

      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}
