import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSettings, getSvgs, getLogo, collectSvgIds } from "@/lib/cms";
import { getPostBySlug, getPosts } from "@/lib/blog";
import { renderMarkdown, readingTime, extractToc } from "@/lib/markdown";
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
    title, description, keywords: post.tags.length ? post.tags : undefined,
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
  const author = (post as any).blog_authors as { name: string; role: string | null; bio: string | null; avatar_svg_id: string | null } | null;

  const settings = await getSettings();
  const logo = await getLogo(settings);
  const themeVars_ = themeVars(settings);

  const svgIds = collectSvgIds([...post.blocks_before, ...post.blocks_after]);
  if (post.cover_svg_id) svgIds.add(post.cover_svg_id);
  if (author?.avatar_svg_id) svgIds.add(author.avatar_svg_id);
  const svgs = await getSvgs(svgIds);

  const related = (await getPosts({ categoryId: cat.id, limit: 4 })).filter((p: any) => p.id !== post.id).slice(0, 3);
  const relatedSvgIds = new Set<string>();
  related.forEach((p: any) => p.cover_svg_id && relatedSvgIds.add(p.cover_svg_id));
  const relatedSvgs = await getSvgs(relatedSvgIds);

  const ctx = { svgs, settings, page: undefined };
  const html = renderMarkdown(post.content_md);
  const toc = extractToc(post.content_md);
  const minutes = readingTime(post.content_md);

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Article",
    headline: post.title,
    description: post.excerpt ?? undefined,
    keywords: post.tags.length ? post.tags.join(", ") : undefined,
    datePublished: post.publish_at ?? post.created_at,
    dateModified: post.updated_at,
    author: author?.name ? { "@type": "Person", name: author.name } : undefined,
  };

  return (
    <div style={themeVars_} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      {preview ? <div className="bg-accent px-4 py-2 text-center text-sm text-white">Preview — status: {post.status}</div> : null}
      <SiteHeader settings={settings} logo={logo} />

      <main className="mx-auto w-full max-w-7xl px-5 py-10 md:px-10">
        <div className="mb-6 text-sm text-muted">
          <Link href="/" className="hover:text-ink">Home</Link> / <Link href="/updates" className="hover:text-ink">Updates</Link> / <Link href={`/updates/${cat.slug}`} className="hover:text-ink">{cat.name}</Link>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_320px] lg:items-start">
          {/* MAIN: each block — and the article — is its own separate box, not one shared card */}
          <div className="flex flex-col gap-6">
            {post.blocks_before.map((b, i) => (
              <div key={`before-${i}`} className="overflow-hidden rounded-3xl bg-white">
                <RenderSections sections={toSections([b], `before-${i}`)} ctx={ctx} />
              </div>
            ))}

            <article className="overflow-hidden rounded-3xl bg-white px-6 py-10 md:px-14 md:py-14">
              <span className="mb-4 inline-block w-fit rounded-full bg-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">{cat.name}</span>
              <h1 className="mb-4 font-display text-3xl font-extrabold leading-tight md:text-5xl">{post.title}</h1>
              {post.excerpt ? <p className="mb-6 text-lg text-muted">{post.excerpt}</p> : null}

              <div className="mb-8 flex items-center gap-3 border-y border-line py-4 text-sm text-muted">
                {author?.avatar_svg_id ? <Svg asset={svgs[author.avatar_svg_id]} fill className="h-11 w-11 shrink-0 overflow-hidden rounded-full" /> : <div className="h-11 w-11 shrink-0 rounded-full bg-soft" />}
                <div className="flex flex-col">
                  {author?.name ? <span className="font-semibold text-ink">{author.name}</span> : null}
                  <span>{author?.role ? `${author.role} · ` : ""}{post.publish_at ? new Date(post.publish_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : ""} · {minutes} min read</span>
                </div>
              </div>

              {post.cover_svg_id ? <Svg asset={svgs[post.cover_svg_id]} fill className="mb-8 aspect-[16/9] overflow-hidden rounded-2xl" /> : null}

              <div className="prose-post" dangerouslySetInnerHTML={{ __html: html }} />

              {post.tags.length ? (
                <div className="mt-8 flex flex-wrap gap-2">
                  {post.tags.map((t) => (
                    <Link key={t} href={`/updates/tag/${encodeURIComponent(t)}`} className="rounded-full bg-ground px-3 py-1 text-xs font-medium text-muted hover:bg-soft hover:text-ink">#{t}</Link>
                  ))}
                </div>
              ) : null}

              {author?.bio ? (
                <div className="mt-10 flex gap-4 border-t border-line pt-6">
                  {author.avatar_svg_id ? <Svg asset={svgs[author.avatar_svg_id]} fill className="h-14 w-14 shrink-0 overflow-hidden rounded-full" /> : <div className="h-14 w-14 shrink-0 rounded-full bg-soft" />}
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold">Written by {author.name}</span>
                    <span className="text-sm leading-relaxed text-muted">{author.bio}</span>
                  </div>
                </div>
              ) : null}
            </article>

            {post.blocks_after.map((b, i) => (
              <div key={`after-${i}`} className="overflow-hidden rounded-3xl bg-white">
                <RenderSections sections={toSections([b], `after-${i}`)} ctx={ctx} />
              </div>
            ))}
          </div>

          {/* SIDEBAR: TOC (auto from headings), CTA (set once in Settings), related reading — none of this needs per-post setup */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
            {toc.length ? (
              <div className="flex flex-col gap-2.5 rounded-2xl bg-white p-5">
                <span className="text-xs font-bold uppercase tracking-wide text-muted">On this page</span>
                {toc.map((item) => (
                  <a key={item.id} href={`#${item.id}`} className={`text-sm hover:text-primary ${item.level === 3 ? "pl-4 text-muted" : "font-medium"}`}>{item.text}</a>
                ))}
              </div>
            ) : null}

            {settings.blog_cta?.heading ? (
              <div className="flex flex-col gap-3 rounded-2xl bg-gradient-to-br from-ink to-primary p-6 text-white">
                <strong className="text-lg">{settings.blog_cta.heading}</strong>
                {settings.blog_cta.text ? <span className="text-sm text-white/75">{settings.blog_cta.text}</span> : null}
                {settings.blog_cta.button_label && settings.blog_cta.button_href ? (
                  <Link href={settings.blog_cta.button_href} className="mt-1 flex h-11 items-center justify-center rounded-full bg-white text-sm font-bold text-ink">{settings.blog_cta.button_label}</Link>
                ) : null}
              </div>
            ) : null}

            {related.length ? (
              <div className="flex flex-col gap-4">
                <h2 className="text-lg font-extrabold">Related reading</h2>
                {related.map((p: any) => (
                  <Link key={p.id} href={`/updates/${cat.slug}/${p.slug}`} prefetch={false} className="flex flex-col gap-3 overflow-hidden rounded-2xl bg-white p-3 shadow-[0_4px_16px_rgba(20,20,43,0.05)]">
                    <Svg asset={p.cover_svg_id ? relatedSvgs[p.cover_svg_id] : undefined} fill className="aspect-[16/10] overflow-hidden rounded-xl" />
                    <span className="px-1 pb-1 text-[15px] font-bold leading-snug">{p.title}</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </aside>
        </div>
      </main>

      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}
