/** A deliberately small Markdown subset — headings, bold, italic, links,
 *  bullet lists, blockquotes, paragraphs. Escapes everything else, so
 *  there's no way for post content to inject raw HTML/scripts even though
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

export function renderMarkdown(md: string): string {
  const lines = (md || "").replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let list: string[] = [];
  let quote: string[] = [];

  const flushList = () => { if (list.length) { out.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join("")}</ul>`); list = []; } };
  const flushQuote = () => { if (quote.length) { out.push(`<blockquote>${inline(quote.join(" "))}</blockquote>`); quote = []; } };

  let para: string[] = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; } };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { flushPara(); flushList(); flushQuote(); continue; }

    const h = /^(#{2,3})\s+(.*)$/.exec(line);
    if (h) { flushPara(); flushList(); flushQuote(); const tag = h[1].length === 2 ? "h2" : "h3"; out.push(`<${tag}>${inline(h[2])}</${tag}>`); continue; }

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
