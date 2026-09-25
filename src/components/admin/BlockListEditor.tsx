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
  const [replacingAt, setReplacingAt] = useState<number | null>(null);
  const nameOf = (key: string) => blockTypes.find((b) => b.key === key)?.name ?? key;

  const addBlock = (bt: BlockType) => {
    onChange([...blocks, { type: bt.key, data: structuredClone(bt.default_data), settings: {} }]);
    setAdding(false);
  };
  const replaceAt = (i: number, bt: BlockType) => {
    onChange(blocks.map((b, j) => (j === i ? { type: bt.key, data: structuredClone(bt.default_data), settings: {} } : b)));
    setReplacingAt(null);
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
            <span className="ml-auto flex gap-3 text-xs text-muted">
              <button type="button" aria-label="Move up" disabled={i === 0} onClick={(e) => { e.preventDefault(); move(i, -1); }}>↑</button>
              <button type="button" aria-label="Move down" disabled={i === blocks.length - 1} onClick={(e) => { e.preventDefault(); move(i, 1); }}>↓</button>
              <button type="button" className="text-primary" onClick={(e) => { e.preventDefault(); setReplacingAt(replacingAt === i ? null : i); }}>Replace</button>
              <button type="button" aria-label="Remove" onClick={(e) => { e.preventDefault(); removeAt(i); }}>✕</button>
            </span>
          </summary>
          <div className="border-t border-line p-3">
            {replacingAt === i ? (
              <div className="mb-3 flex flex-col gap-2 rounded-lg bg-ground p-2">
                <span className="px-1 text-xs text-muted">Replace this block with a different type — its content will reset to that type's defaults.</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {blockTypes.map((bt) => (
                    <button key={bt.key} type="button" className="rounded-md border border-line bg-white p-2 text-left text-xs hover:border-primary" onClick={() => replaceAt(i, bt)}>
                      {bt.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
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
