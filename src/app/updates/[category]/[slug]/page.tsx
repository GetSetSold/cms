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
import { PostCoverArt } from "@/components/blog/PostCoverArt";
import { getHpiMarketAsOf } from "@/lib/hpi";
import { getBocDecisionAsOf, fmtRate } from "@/lib/boc";
import { RenderSections } from "@/components/blocks";
import { BlogAdSlot } from "@/components/blog/BlogAdSlot";
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
  // A stored SEO title that is exactly the post's tag list (comma-joined)
  // is a keyword dump, not a title — it is what share previews were
  // picking up ("Bank of Canada, interest rates, ...") while the H1 showed
  // the real title. Ignore it so sharing and search use the real title.
  const seoTitle = post.seo_title && post.seo_title !== post.tags.join(", ") ? post.seo_title : null;
  const title = seoTitle || post.title;
  const description = post.seo_description || post.excerpt || undefined;
  const ogImage = `/updates/${cat.slug}/${post.slug}/opengraph-image`;
  return {
    title, description, keywords: post.tags.length ? post.tags : undefined,
    alternates: { canonical: `/updates/${cat.slug}/${post.slug}` },
    openGraph: {
      title, description, type: "article",
      url: `/updates/${cat.slug}/${post.slug}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image", title, description,
      images: [ogImage],
    },
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
  // Block images
  (post.content_blocks || []).forEach((b: any) => { if (b.image_svg_id) svgIds.add(b.image_svg_id); });
  const svgs = await getSvgs(svgIds);

  const related = (await getPosts({ categoryId: cat.id, limit: 4 })).filter((p: any) => p.id !== post.id).slice(0, 3);
  const relatedSvgIds = new Set<string>();
  related.forEach((p: any) => p.cover_svg_id && relatedSvgIds.add(p.cover_svg_id));
  const relatedSvgs = await getSvgs(relatedSvgIds);

  const ctx = { svgs, settings, page: undefined };
  const html = renderMarkdown(post.content_md);
  const toc = extractToc(post.content_md);
  const minutes = readingTime(post.content_md);

  // Cover art data: first market_stats block's market + pinned month
  function findCoverMarketBlock(p: any): { slug: string; month: string } | null {
    for (const list of [p.blocks_before, p.blocks_after].filter(Array.isArray)) {
      for (const b of list) {
        const isMarket = b?.block_type === "market_stats" || b?.type === "market_stats";
        if (isMarket && b?.data?.market_slug) return { slug: b.data.market_slug, month: (b.data.month as string) || "" };
      }
    }
    return null;
  }
  // Cover art data: first rate_update block's pinned decision date
  function findCoverRateBlock(p: any): { decisionDate: string } | null {
    for (const list of [p.blocks_before, p.blocks_after].filter(Array.isArray)) {
      for (const b of list) {
        const isRate = b?.block_type === "rate_update" || b?.type === "rate_update";
        if (isRate) return { decisionDate: (b?.data?.decision_date as string) || "" };
      }
    }
    return null;
  }
  function monthLabelForCover(ym: string): string {
    const [y, mo] = ym.split("-");
    const d = new Date(Number(y), Number(mo) - 1, 1);
    return isNaN(d.getTime()) ? ym : d.toLocaleDateString("en-CA", { month: "long", year: "numeric" });
  }
  const coverBlock = findCoverMarketBlock(post);
  const coverMarket = coverBlock ? await getHpiMarketAsOf(coverBlock.slug, coverBlock.month) : null;
  const coverRateBlock = !coverMarket ? findCoverRateBlock(post) : null;
  const coverRate = coverRateBlock ? await getBocDecisionAsOf(coverRateBlock.decisionDate) : null;

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
        <nav className="py-3 text-[13px] text-muted" aria-label="Breadcrumb">
          <Link href="/">Home</Link> / <Link href="/updates">Updates</Link> / <Link href={`/updates/${cat.slug}`}>{cat.name}</Link>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1fr_320px] lg:items-start">
          {/* MAIN: each block — and the article — is its own separate box, not one shared card */}
          <div className="flex flex-col gap-6">
            {post.blocks_before.map((b, i) => (
              <div key={`before-${i}`} className="overflow-hidden rounded-[var(--radius-lg)] bg-white">
                <RenderSections sections={toSections([b], `before-${i}`)} ctx={ctx} />
              </div>
            ))}

            <article className="overflow-hidden rounded-[var(--radius-lg)] bg-white px-6 py-10 md:px-14 md:py-14">
              <span className="mb-4 inline-block w-fit rounded-[var(--radius-label)] bg-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">{cat.name}</span>
              <h1 className="mb-4 font-display font-bold text-[30px] leading-[1.15] tracking-tight md:text-[28px] md:leading-[1.2]">{post.title}</h1>
              {post.excerpt ? <p className="mb-6 text-lg text-muted">{post.excerpt}</p> : null}

              <div className="mb-8 flex items-center gap-3 border-y border-line py-4 text-sm text-muted">
                {author?.avatar_svg_id ? <Svg asset={svgs[author.avatar_svg_id]} fill className="h-11 w-11 shrink-0 overflow-hidden rounded-full" /> : <div className="h-11 w-11 shrink-0 rounded-full bg-soft" />}
                <div className="flex flex-col">
                  {author?.name ? <span className="font-semibold text-ink">{author.name}</span> : null}
                  <span>{author?.role ? `${author.role} · ` : ""}{post.publish_at ? new Date(post.publish_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : ""} · {minutes} min read</span>
                </div>
              </div>

              {post.cover_svg_id ? (
                <div className="mb-8 overflow-hidden rounded-[var(--radius-lg)]">
                  <Svg asset={svgs[post.cover_svg_id]} fill className="aspect-video w-full" />
                </div>
              ) : (
                <div className="mb-8">
                  <PostCoverArt
                    marketName={coverMarket?.name}
                    monthLabel={coverMarket ? monthLabelForCover(coverMarket.pinnedMonth) : undefined}
                    benchmark={coverMarket?.latest.compositeBenchmark}
                    momChange={coverMarket?.latest.momChange}
                    rateLabel={coverRate ? "BoC Target Rate" : undefined}
                    rateValue={coverRate && coverRate.target !== null ? fmtRate(coverRate.target) : undefined}
                    rateChange={coverRate?.change ? `${coverRate.change.direction === "up" ? "+" : "\u2212"}${coverRate.change.change.toFixed(2)}` : coverRate ? "Hold" : undefined}
                  />
                </div>
              )}

              {post.tags.length ? (
                <div className="mt-8 flex flex-wrap gap-2">
                  {post.tags.map((t) => (
                    <Link key={t} href={`/updates/tag/${encodeURIComponent(t)}`} className="rounded-[var(--radius-btn)] bg-ground px-3 py-1 text-xs font-medium text-muted hover:bg-soft hover:text-ink">#{t}</Link>
                  ))}
                </div>
              ) : null}

            </article>

            {/* Content blocks: each is its own separate card, outside the article */}
            {post.content_blocks?.length ? (
              <>
                {post.content_blocks.map((block: any) => {
                  const bg = block.bg || "white";
                  const bgStyle =
                    bg === "black" ? { background: "#1a1a1a", color: "#fff" } :
                    bg === "blue" ? { background: "#0099cc", color: "#fff" } :
                    bg === "gray" ? { background: "#f7f7f7", border: "1px solid #ececec" } :
                    { background: "#fff", border: "1px solid #e5e5e5" };
                  const is2col = block.layout === "2col";
                  return (
                    <section key={block.id}
                      className="p-6 md:p-10 rounded-[var(--radius-lg)] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
                      style={bgStyle}>
                      {block.header && (
                        <h2 className="text-xl font-semibold mb-4 pb-2 border-b-2"
                          style={{ borderColor: bg === "black" || bg === "blue" ? "rgba(255,255,255,0.3)" : "#1a1a1a" }}>
                          {block.header}
                        </h2>
                      )}
                      <div className={is2col ? "grid md:grid-cols-2 gap-6 items-center" : ""}>
                        {block.image_svg_id && svgs[block.image_svg_id] ? (
                          <div className="mb-4 md:mb-0 flex items-center justify-center">
                            <Svg asset={svgs[block.image_svg_id]} className="w-full max-w-[320px] h-auto rounded-[var(--radius-md)]" />
                          </div>
                        ) : null}
                        <div className="prose-post" dangerouslySetInnerHTML={{ __html: renderMarkdown(block.content) }} />
                      </div>
                    </section>
                  );
                })}
              </>
            ) : (
              <article className="overflow-hidden rounded-[var(--radius-lg)] bg-white px-6 py-10 md:px-14 md:py-14">
                <div className="prose-post" dangerouslySetInnerHTML={{ __html: html }} />
              </article>
            )}

            {post.blocks_after.map((b, i) => (
              <div key={`after-${i}`} className="overflow-hidden rounded-[var(--radius-lg)] bg-white">
                <RenderSections sections={toSections([b], `after-${i}`)} ctx={ctx} />
              </div>
            ))}
          </div>

          {/* SIDEBAR: CTA first (lead capture = priority), then ad, TOC, related */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
            {settings.blog_cta?.heading ? (
              <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] bg-gradient-to-br from-ink to-primary p-6 text-white">
                <strong className="text-lg">{settings.blog_cta.heading}</strong>
                {settings.blog_cta.text ? <span className="text-sm text-white/75">{settings.blog_cta.text}</span> : null}
                {settings.blog_cta.button_label && settings.blog_cta.button_href ? (
                  <Link href={settings.blog_cta.button_href} className="mt-1 flex h-11 items-center justify-center rounded-[var(--radius-btn)] bg-white text-sm font-bold text-ink">{settings.blog_cta.button_label}</Link>
                ) : null}
              </div>
            ) : null}

            {settings.ads?.blog_ad_enabled && settings.ads?.blog_ad_code ? (
              <BlogAdSlot code={settings.ads.blog_ad_code} />
            ) : null}

            {toc.length ? (
              <div className="flex flex-col gap-2.5 rounded-[var(--radius-lg)] bg-white p-5">
                <span className="text-xs font-bold uppercase tracking-wide text-muted">On this page</span>
                {toc.map((item) => (
                  <a key={item.id} href={`#${item.id}`} className={`text-sm hover:text-primary ${item.level === 3 ? "pl-4 text-muted" : "font-medium"}`}>{item.text}</a>
                ))}
              </div>
            ) : null}

            {related.length ? (
              <div className="flex flex-col gap-4">
                <h2 className="text-lg font-extrabold">Related reading</h2>
                {related.map((p: any) => (
                  <Link key={p.id} href={`/updates/${cat.slug}/${p.slug}`} prefetch={false} className="flex flex-col gap-3 overflow-hidden rounded-[var(--radius-lg)] bg-white p-3 shadow-[var(--shadow-card)]">
                    <Svg asset={p.cover_svg_id ? relatedSvgs[p.cover_svg_id] : undefined} fill className="aspect-[16/10] overflow-hidden rounded-[var(--radius-md)]" />
                    <span className="px-1 pb-1 text-[13px] md:text-[15px] font-bold leading-snug">{p.title}</span>
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
