"use client";
import { useState } from "react";
import type { SvgAsset } from "@/lib/types";

export function SvgThumb({ asset, className = "" }: { asset?: SvgAsset; className?: string }) {
  if (!asset) return <div className={`rounded-md bg-soft ${className}`} />;
  return <div className={`svg-box overflow-hidden rounded-md ${className}`} dangerouslySetInnerHTML={{ __html: asset.markup }} />;
}

export function SvgPicker({ value, svgs, onChange }: { value?: string | null; svgs: SvgAsset[]; onChange: (id: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const current = svgs.find((s) => s.id === value);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-16 items-center gap-2.5 rounded-lg border border-line p-2">
        <SvgThumb asset={current} className="h-[46px] w-16 shrink-0" />
        <span className="truncate text-ink">{current?.name ?? "None"}</span>
        <button type="button" className="ml-auto text-primary" onClick={() => setOpen(!open)}>{open ? "Close" : "Change"}</button>
      </div>
      {open ? (
        <div className="grid max-h-64 grid-cols-3 gap-2 overflow-auto rounded-lg border border-line p-2">
          <button type="button" onClick={() => { onChange(null); setOpen(false); }} className="flex aspect-[4/3] items-center justify-center rounded-md border border-dashed border-line text-xs">None</button>
          {svgs.map((s) => (
            <button type="button" key={s.id} title={s.name} onClick={() => { onChange(s.id); setOpen(false); }}
              className={`rounded-md border-2 ${s.id === value ? "border-primary" : "border-transparent"}`}>
              <SvgThumb asset={s} className="aspect-[4/3] w-full" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
