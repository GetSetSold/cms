/** A deliberately small Markdown subset — headings, bold, italic, links,
 *  bullet lists, blockquotes, callouts, paragraphs. Escapes everything else,
 *  so there's no way for post content to inject raw HTML/scripts even though
 *  it's rendered with dangerouslySetInnerHTML — every tag in the output
 *  comes from this function, never from the input directly. */

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inline(text: string): string {
  let s = escapeHtml(text);
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g, "<em>$1</em>");
  s = s.replace(/\[(.+?)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, '<a href="$2" class="text-primary underline">$1</a>');
  return s;
}

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "section";
}

/** Dedupes slugs across a document (e.g. two headings both called "Overview") —
 *  used identically by extractToc and renderMarkdown so their ids always match. */
function makeSlugger() {
  const seen = new Map<string, number>();
  return (text: string) => {
    const base = slugify(text);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n === 0 ? base : `${base}-${n}`;
  };
}

export type TocItem = { id: string; text: string; level: 2 | 3 };

/** Pulls ##/### headings for a table of contents — no authoring step, just
 *  reads whatever headings are already in the post. */
export function extractToc(md: string): TocItem[] {
  const slug = makeSlugger();
  const toc: TocItem[] = [];
  for (const raw of (md || "").split("\n")) {
    const h = /^(#{2,3})\s+(.*)$/.exec(raw.trim());
    if (h) toc.push({ level: (h[1].length === 2 ? 2 : 3), text: h[2], id: slug(h[2]) });
  }
  return toc;
}

const CALLOUT: Record<string, { cls: string; icon: string }> = {
  tip: { cls: "callout-tip", icon: "✓" },
  warning: { cls: "callout-warning", icon: "!" },
  note: { cls: "callout-note", icon: "i" },
};

export function renderMarkdown(md: string): string {
  const lines = (md || "").replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  const slug = makeSlugger(); // same dedupe sequence as extractToc, so ids line up
  let list: string[] = [];
  let quote: string[] = [];

  const flushList = () => { if (list.length) { out.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join("")}</ul>`); list = []; } };

  const flushQuote = () => {
    if (!quote.length) return;
    // A blockquote whose first line is "[!tip]" / "[!warning]" / "[!note]"
    // renders as a styled callout box instead of a plain quote — typed
    // inline while writing, no block or extra step needed.
    const m = /^\[!(tip|warning|note)\]\s*(.*)$/i.exec(quote[0].trim());
    if (m) {
      const type = CALLOUT[m[1].toLowerCase()];
      const text = [m[2], ...quote.slice(1)].filter(Boolean).join(" ");
      out.push(`<div class="callout ${type.cls}"><span class="callout-icon">${type.icon}</span><div>${inline(text)}</div></div>`);
    } else {
      out.push(`<blockquote>${inline(quote.join(" "))}</blockquote>`);
    }
    quote = [];
  };

  let para: string[] = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; } };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { flushPara(); flushList(); flushQuote(); continue; }

    const h = /^(#{2,3})\s+(.*)$/.exec(line);
    if (h) { flushPara(); flushList(); flushQuote(); const tag = h[1].length === 2 ? "h2" : "h3"; out.push(`<${tag} id="${slug(h[2])}">${inline(h[2])}</${tag}>`); continue; }

    const li = /^[-*]\s+(.*)$/.exec(line);
    if (li) { flushPara(); flushQuote(); list.push(li[1]); continue; }

    const bq = /^>\s?(.*)$/.exec(line);
    if (bq) { flushPara(); flushList(); quote.push(bq[1]); continue; }

    flushList(); flushQuote();
    para.push(line);
  }
  flushPara(); flushList(); flushQuote();
  return out.join("\n");
}

/** Rough reading time from word count — no need to store this, it's cheap to compute on read. */
export function readingTime(md: string): number {
  const words = (md || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
