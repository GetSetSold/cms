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
  { label: "❝", line: "> " },
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
    } else {
      const atLineStart = s === 0 || value[s - 1] === "\n";
      const prefix = atLineStart ? "" : "\n";
      next = `${before}${prefix}${tool.line}${selected}${after}`;
      caret = s + prefix.length + (tool.line?.length ?? 0) + selected.length;
    }
    onChange(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(caret, caret); });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 rounded-lg border border-line bg-ground p-1">
        {TOOLS.map((t) => (
          <button key={t.label} type="button" onClick={() => apply(t)} className="flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium hover:bg-white" title={t.label}>
            {t.label}
          </button>
        ))}
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
