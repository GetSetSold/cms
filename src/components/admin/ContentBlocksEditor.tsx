"use client";
import { useRef, useState } from "react";
import { renderMarkdown } from "@/lib/markdown";

export interface ContentBlock {
  id: string;
  header: string;
  content: string;
  image_svg_id?: string | null;
}

const TOOLS: { label: string; wrap?: [string, string]; line?: string }[] = [
  { label: "B", wrap: ["**", "**"] },
  { label: "I", wrap: ["*", "*"] },
  { label: "H2", line: "## " },
  { label: "H3", line: "### " },
  { label: "Link", wrap: ["[", "](https://)"] },
  { label: "•", line: "- " },
  { label: "❝", line: "> " },
  { label: "Tip", line: "> [!tip] " },
  { label: "Warning", line: "> [!warning] " },
  { label: "Note", line: "> [!note] " },
];

function BlockToolbar({ onApply }: { onApply: (t: (typeof TOOLS)[number]) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-line bg-ground p-1 flex-wrap mb-2">
      {TOOLS.map((t) => (
        <button key={t.label} type="button" onClick={() => onApply(t)}
          className="flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-xs font-medium hover:bg-white" title={t.label}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

function applyToTextarea(
  ref: React.RefObject<HTMLTextAreaElement>,
  value: string,
  onChange: (v: string) => void,
  tool: (typeof TOOLS)[number]
) {
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

export function ContentBlocksEditor({
  blocks,
  onChange,
  svgs = [],
}: {
  blocks: ContentBlock[];
  onChange: (b: ContentBlock[]) => void;
  svgs?: { id: string; name: string }[];
}) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const addBlock = () => {
    onChange([...blocks, { id: crypto.randomUUID(), header: "", content: "" }]);
  };

  const update = (id: string, patch: Partial<ContentBlock>) => {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const remove = (id: string) => {
    if (!confirm("Delete this block?")) return;
    onChange(blocks.filter((b) => b.id !== id));
  };

  const move = (id: string, dir: -1 | 1) => {
    const i = blocks.findIndex((b) => b.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, idx) => (
        <div key={block.id} className="rounded-lg border border-line bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-muted">#{idx + 1}</span>
            <div className="ml-auto flex gap-1">
              <button type="button" onClick={() => move(block.id, -1)} disabled={idx === 0}
                className="rounded px-2 py-1 text-xs hover:bg-ground disabled:opacity-30">↑</button>
              <button type="button" onClick={() => move(block.id, 1)} disabled={idx === blocks.length - 1}
                className="rounded px-2 py-1 text-xs hover:bg-ground disabled:opacity-30">↓</button>
              <button type="button" onClick={() => setPreviewId(previewId === block.id ? null : block.id)}
                className="rounded px-2 py-1 text-xs hover:bg-ground">
                {previewId === block.id ? "Edit" : "Preview"}
              </button>
              <button type="button" onClick={() => remove(block.id)}
                className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">Delete</button>
            </div>
          </div>

          <label className="label mb-2">Block header
            <input className="input" value={block.header}
              onChange={(e) => update(block.id, { header: e.target.value })}
              placeholder="e.g. First-Time Home Buyers' Tax Credit — $1,500" />
          </label>

          {svgs.length > 0 && (
            <label className="label mb-2">Block image <span className="font-normal text-muted">(optional)</span>
              <select className="input" value={block.image_svg_id || ""}
                onChange={(e) => update(block.id, { image_svg_id: e.target.value || null })}>
                <option value="">No image</option>
                {svgs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
          )}

          {previewId === block.id ? (
            <div className="rounded-lg border border-line bg-ground p-4">
              {block.header && (
                <h3 className="text-lg font-semibold mb-3 pb-2 border-b-2 border-ink">{block.header}</h3>
              )}
              <div className="prose-post" dangerouslySetInnerHTML={{ __html: renderMarkdown(block.content) || "<p class='text-muted'>Empty block.</p>" }} />
            </div>
          ) : (
            <>
              <BlockToolbar onApply={(t) => applyToTextarea(
                { current: refs.current[block.id] } as React.RefObject<HTMLTextAreaElement>,
                block.content,
                (v) => update(block.id, { content: v }),
                t
              )} />
              <textarea
                ref={(el) => { refs.current[block.id] = el; }}
                value={block.content}
                onChange={(e) => update(block.id, { content: e.target.value })}
                rows={8}
                placeholder="Block content — use the toolbar for formatting..."
                className="textarea min-h-[160px] font-mono text-[13px] leading-relaxed"
              />
            </>
          )}
        </div>
      ))}

      <button type="button" onClick={addBlock}
        className="rounded-lg border-2 border-dashed border-line p-4 text-sm font-medium text-muted hover:border-ink hover:text-ink transition-colors">
        + Add content block
      </button>
    </div>
  );
}
