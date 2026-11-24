/**
 * Live site knowledge for the chat assistant: a directory of every
 * published CMS page (title + URL + SEO summary) plus the text of the
 * page a question is about. Read from the CMS database at request time
 * (cached 10 minutes) — publish a page and the assistant knows it,
 * with no knowledge file to maintain by hand. The curated facts in
 * chatKnowledge.ts stay the source of truth for prices and programs.
 */
import { createClient } from "@/lib/supabase/server";
import { GUIDES } from "@/lib/guides/registry";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.getsetsold.ca";
const TTL_MS = 10 * 60 * 1000;

type PageRow = { slug: string; title: string; seo_description: string | null };

let cache: { at: number; pages: PageRow[]; directory: string } | null = null;

async function loadPages(): Promise<PageRow[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.pages;
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select("slug, title, seo_description, noindex, exclude_from_sitemap")
    .in("status", ["published", "scheduled"])
    .or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`)
    .order("title")
    .limit(300);
  const pages = ((data ?? []) as (PageRow & { noindex?: boolean; exclude_from_sitemap?: boolean })[])
    .filter((p) => !p.noindex && !p.exclude_from_sitemap)
    .map(({ slug, title, seo_description }) => ({ slug, title, seo_description }));
  const lines = pages.map(
    (p) => `- ${p.title} — ${p.slug === "home" ? `${SITE}/` : `${SITE}/${p.slug}`}${p.seo_description ? ` — ${p.seo_description}` : ""}`,
  );
  for (const g of GUIDES) {
    lines.push(`- ${g.title} (Guide) — ${SITE}/guides/${g.id} — ${g.seoDescription}`);
  }
  cache = { at: Date.now(), pages, directory: lines.join("\n") };
  return pages;
}

/** The SITE PAGES block for the system prompt: every page on the site. */
export async function siteDirectory(): Promise<string> {
  try {
    const pages = await loadPages();
    return cache ? `\n\nSITE PAGES (every page on this website — use these links when a page would help the visitor)\n${cache.directory}` : "";
  } catch {
    return "";
  }
}

const STOP = new Set(["what", "where", "when", "does", "have", "with", "about", "that", "this", "from", "your", "there", "their", "them", "then", "than", "into", "over", "under", "more", "much", "many", "show", "tell", "give", "want", "need", "looking", "find"]);
const SKIP_KEY = /url|image|img|icon|svg|color|href|_id$|key$/i;

/** Collect readable text out of a page's section data (block fields). */
function extractText(value: unknown, out: string[], seen: Set<string>) {
  if (typeof value === "string") {
    const t = value.replace(/\s+/g, " ").trim();
    if (t.length >= 12 && !t.startsWith("http") && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) extractText(v, out, seen);
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SKIP_KEY.test(k)) continue;
      extractText(v, out, seen);
    }
  }
}

async function pageText(slug: string): Promise<{ title: string; url: string; text: string } | null> {
  const supabase = await createClient();
  const { data: page } = await supabase.from("pages").select("id, title").eq("slug", slug).maybeSingle();
  if (!page) return null;
  const { data: sections } = await supabase
    .from("page_sections")
    .select("data")
    .eq("page_id", page.id)
    .eq("is_visible", true)
    .order("position");
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of sections ?? []) extractText((s as { data: unknown }).data, out, seen);
  const text = out.join("\n").slice(0, 3500);
  if (!text) return null;
  return { title: page.title as string, url: slug === "home" ? `${SITE}/` : `${SITE}/${slug}`, text };
}

/**
 * Content of the page the visitor is on, plus the page their question
 * best matches — so answers can come from the actual page, not just its
 * directory line. Returns "" when nothing matches confidently.
 */
export async function matchedPageContext(question: string, path: string): Promise<string> {
  try {
    const pages = await loadPages();
    const bySlug = new Map(pages.map((p) => [p.slug, p]));
    const picks: PageRow[] = [];

    const pathSlug = path.replace(/^\/+/, "").split("/")[0] || "home";
    if (bySlug.has(pathSlug) && !["real-estate", "listings"].includes(pathSlug)) {
      picks.push(bySlug.get(pathSlug)!);
    }

    const words = new Set(
      question.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !STOP.has(w)),
    );
    let best: PageRow | null = null;
    let bestScore = 0;
    for (const p of pages) {
      if (picks.some((x) => x.slug === p.slug)) continue;
      const slugWords = p.slug.split("-");
      const titleWords = p.title.toLowerCase().split(/[^a-z0-9]+/);
      const desc = (p.seo_description ?? "").toLowerCase();
      let score = 0;
      for (const w of words) {
        if (slugWords.includes(w)) score += 3;
        if (titleWords.includes(w)) score += 2;
        if (desc.includes(w)) score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }
    if (best && bestScore >= 3) picks.push(best);

    const parts: string[] = [];
    for (const p of picks.slice(0, 2)) {
      const content = await pageText(p.slug);
      if (content) {
        parts.push(`Page: ${content.title} (${content.url})\n${content.text}`);
      }
    }
    return parts.length ? `\n\nPAGE CONTENT (answer from this text when the question is about one of these pages)\n${parts.join("\n\n")}` : "";
  } catch {
    return "";
  }
}
