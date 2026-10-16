import Link from "next/link";
import { Svg } from "@/components/site/Svg";
import { BlogCardArt } from "./BlogCardArt";

/** Prettify a market slug: "hamilton-burlington" -> "Hamilton–Burlington". */
function marketNameFromSlug(slug: string): string {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("–");
}

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

/**
 * Uniform blog card — image edge-to-edge at top (cover SVG or matte
 * category placeholder), white body, pill Read More button.
 */
export function BlogCard({ post, svgs }: { post: any; svgs: Record<string, any> }) {
  const catSlug = post.blog_categories?.slug ?? "post";
  const catName = post.blog_categories?.name ?? "";
  const mSlug = marketSlugForPost(post);
  const marketLabel = mSlug ? `${marketNameFromSlug(mSlug)} · ${monthYear(post.publish_at)}` : undefined;

  return (
    <Link
      href={`/updates/${catSlug}/${post.slug}`}
      prefetch={false}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-lg)] bg-white shadow-[var(--shadow-card)]"
    >
      {post.cover_svg_id && svgs[post.cover_svg_id] ? (
        <Svg asset={svgs[post.cover_svg_id]} fill className="aspect-[16/10] w-full overflow-hidden" />
      ) : (
        <BlogCardArt categorySlug={catSlug} categoryName={catName || "Update"} title={post.title} marketLabel={marketLabel} />
      )}
      <div className="flex flex-1 flex-col gap-2 bg-white px-5 pb-5 pt-4">
        {catName ? <span className="text-[11px] font-bold uppercase tracking-wide text-primary">{catName}</span> : null}
        <h3 className="text-lg font-bold leading-snug group-hover:text-primary">{post.title}</h3>
        {post.excerpt ? <p className="line-clamp-2 text-[13px] text-muted">{post.excerpt}</p> : null}
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
}
