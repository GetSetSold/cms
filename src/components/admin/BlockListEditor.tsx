"use client";
import { useState } from "react";
import { BLOCK_FIELDS } from "@/lib/block-fields";
import { FieldEditor } from "./FieldEditor";
import type { BlockInstance, CmsForm, SvgAsset } from "@/lib/types";

type BlockType = { key: string; name: string; category: string; default_data: Record<string, any> };

export function BlockListEditor({
  blocks, blockTypes, svgs, forms, onChange, label,
}: {
  blocks: BlockInstance[]; blockTypes: BlockType[]; svgs: SvgAsset[]; forms: CmsForm[]; onChange: (b: BlockInstance[]) => void; label: string;
}) {
  const [adding, setAdding] = useState(false);
  const nameOf = (key: string) => blockTypes.find((b) => b.key === key)?.name ?? key;

  const addBlock = (bt: BlockType) => {
    onChange([...blocks, { type: bt.key, data: structuredClone(bt.default_data), settings: {} }]);
    setAdding(false);
  };
  const removeAt = (i: number) => onChange(blocks.filter((_, j) => j !== i));
  const move = (i: number, dir: -1 | 1) => {
    const n = [...blocks];
    if (!n[i + dir]) return;
    [n[i], n[i + dir]] = [n[i + dir], n[i]];
    onChange(n);
  };
  const setData = (i: number, data: Record<string, any>) => onChange(blocks.map((b, j) => (j === i ? { ...b, data } : b)));

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-muted">{label}</span>
      {blocks.map((b, i) => (
        <details key={i} className="rounded-lg border border-line" open={blocks.length <= 1}>
          <summary className="flex cursor-pointer items-center gap-2 px-3 py-2">
            <span className="font-medium">{nameOf(b.type)}</span>
            <span className="ml-auto flex gap-1.5 text-muted">
              <button type="button" aria-label="Move up" disabled={i === 0} onClick={(e) => { e.preventDefault(); move(i, -1); }}>↑</button>
              <button type="button" aria-label="Move down" disabled={i === blocks.length - 1} onClick={(e) => { e.preventDefault(); move(i, 1); }}>↓</button>
              <button type="button" aria-label="Remove" onClick={(e) => { e.preventDefault(); removeAt(i); }}>✕</button>
            </span>
          </summary>
          <div className="border-t border-line p-3">
            <FieldEditor fields={BLOCK_FIELDS[b.type] ?? []} value={b.data ?? {}} onChange={(d) => setData(i, d)} svgs={svgs} forms={forms} />
          </div>
        </details>
      ))}
      {adding ? (
        <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-line p-2">
          {blockTypes.map((bt) => (
            <button key={bt.key} type="button" className="rounded-md border border-line p-2 text-left text-xs hover:border-primary" onClick={() => addBlock(bt)}>
              {bt.name}
            </button>
          ))}
        </div>
      ) : null}
      <button type="button" className="btn self-start border-dashed" onClick={() => setAdding(!adding)}>+ Add block</button>
    </div>
  );
}
