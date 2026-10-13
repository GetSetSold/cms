"use client";
import { useRef, useState } from "react";
import { renderMarkdown, readingTime } from "@/lib/markdown";

const TOOLS: { label: string; wrap?: [string, string]; line?: string }[] = [
  { label: "B", wrap: ["**", "**"] },
  { label: "I", wrap: ["*", "*"] },
  { label: "H2", line: "## " },
  { label: "H3", line: "### " },
  { label: "Link", wrap: ["[", "](https://)"] },
  { label: "•", line: "- " },
  { label: "☑", line: "+ " },
  { label: "❝", line: "> " },
  { label: "Tip", line: "> [!tip] " },
  { label: "Warning", line: "> [!warning] " },
  { label: "Note", line: "> [!note] " },
  { label: "Box", wrap: ["\n::: box light\n", "\n:::\n"] },
];

export function MarkdownEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");

  function apply(tool: (typeof TOOLS)[number]) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const before = value.slice(0, s);
    const selected = value.slice(s, e);
    const after = value.slice(e);

    let next: string; let caret: number;
    if (tool.wrap) {
      next = `${before}${tool.wrap[0]}${selected}${tool.wrap[1]}${after}`;
      caret = s + tool.wrap[0].length + selected.length + (selected ? tool.wrap[1].length : 0);
    } else if (tool.line && selected.includes("\n") && (tool.line === "- " || tool.line === "+ ")) {
      // Multi-line selection with a list-style tool: prefix every line, not
      // just the first — selecting a paragraph and clicking Checklist turns
      // the whole thing into checked items, not just the first line.
      const atLineStart = s === 0 || value[s - 1] === "\n";
      const prefix = atLineStart ? "" : "\n";
      const prefixed = selected.split("\n").map((line) => (line.trim() ? `${tool.line}${line}` : line)).join("\n");
      next = `${before}${prefix}${prefixed}${after}`;
      caret = s + prefix.length + prefixed.length;
    } else {
      const atLineStart = s === 0 || value[s - 1] === "\n";
      const prefix = atLineStart ? "" : "\n";
      next = `${before}${prefix}${tool.line}${selected}${after}`;
      caret = s + prefix.length + (tool.line?.length ?? 0) + selected.length;
    }
    onChange(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(caret, caret); });
  }

  function autoFormat() {
    if (!value.trim()) return;
    if (!confirm("Auto-format will restructure this post:\n\n• Convert Note:/Tip:/Warning: lines to callout boxes\n• Add a Key Takeaways box from your H2 headings\n• Wrap standalone $ amounts in stat boxes\n\nYour text is preserved — only formatting is added. Continue?")) return;

    let text = value;

    // 1. Convert "Note:" / "Tip:" / "Warning:" / "Important:" paragraph starters to callouts
    const calloutPatterns: [RegExp, string][] = [
      [/^(Note|Important):\s*(.+)$/gim, "> [!note] $2"],
      [/^Tip:\s*(.+)$/gim, "> [!tip] $1"],
      [/^Warning:\s*(.+)$/gim, "> [!warning] $1"],
    ];
    for (const [re, rep] of calloutPatterns) {
      text = text.replace(re, rep);
    }

    // 2. Generate Key Takeaways box from H2 headings (if not already present)
    if (!text.includes("Key Takeaways") && !text.includes("::: box")) {
      const headings = [...text.matchAll(/^##\s+(.+)$/gm)]
        .map(m => m[1].trim())
        .filter(h => !/frequently asked|faq/i.test(h))
        .slice(0, 6);
      if (headings.length >= 3) {
        const takeaways = headings.map(h => `- ${h}`).join("\n");
        const box = `::: box light\n**Key Takeaways**\n\n${takeaways}\n:::\n\n`;
        // Insert after first paragraph (after the intro)
        const lines = text.split("\n");
        let insertAt = 0;
        let blankCount = 0;
        for (let i = 0; i < lines.length; i++) {
          if (!lines[i].trim()) blankCount++;
          if (blankCount >= 2) { insertAt = i + 1; break; }
        }
        lines.splice(insertAt, 0, box);
        text = lines.join("\n");
      }
    }

    // 3. Wrap standalone dollar-amount paragraphs in stat boxes
    // Matches paragraphs that are essentially just a big number + label
    text = text.replace(
      /^(\*\*)?(\$[\d,]+)\s*(.+?)\*\*$/gm,
      (match, bold1, amount, label) => {
        // Only if the label is short (looks like a stat, not a sentence)
        if (label.length < 60 && !label.includes(".")) {
          return `::: box light\n**${amount}** — ${label}\n:::`;
        }
        return match;
      }
    );

    onChange(text);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 rounded-lg border border-line bg-ground p-1 flex-wrap">
        {TOOLS.map((t) => (
          <button key={t.label} type="button" onClick={() => apply(t)} className="flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium hover:bg-white" title={t.label}>
            {t.label}
          </button>
        ))}
        <button type="button" onClick={autoFormat} className="flex h-8 items-center justify-center rounded-md px-3 text-sm font-semibold text-white hover:opacity-90" style={{ background: "#0066cc" }} title="Auto-structure: converts Note:/Tip:/Warning: lines to callouts, adds takeaways box from headings">
          ✨ Auto-format
        </button>
        <div className="ml-auto flex rounded-md bg-white p-0.5 text-xs">
          <button type="button" onClick={() => setTab("write")} className={`h-7 rounded px-2.5 ${tab === "write" ? "bg-ground font-medium" : "text-muted"}`}>Write</button>
          <button type="button" onClick={() => setTab("preview")} className={`h-7 rounded px-2.5 ${tab === "preview" ? "bg-ground font-medium" : "text-muted"}`}>Preview</button>
        </div>
      </div>

      {tab === "write" ? (
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={20}
          placeholder="Write the post here. Use the toolbar for headings, bold, links, lists, and quotes — plain text otherwise."
          className="textarea min-h-[420px] font-mono text-[14px] leading-relaxed"
        />
      ) : (
        <div className="min-h-[420px] rounded-lg border border-line bg-white p-6">
          <div className="prose-post" dangerouslySetInnerHTML={{ __html: renderMarkdown(value) || "<p class='text-muted'>Nothing written yet.</p>" }} />
        </div>
      )}
      <span className="text-xs text-muted">{readingTime(value)} min read (estimated) · {value.trim().split(/\s+/).filter(Boolean).length} words</span>
    </div>
  );
}
