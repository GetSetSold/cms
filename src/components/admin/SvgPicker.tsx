"use client";
import { useMemo, useState } from "react";
import type { SvgAsset } from "@/lib/types";

export function SvgThumb({ asset, className = "" }: { asset?: SvgAsset; className?: string }) {
  if (!asset) return <div className={`rounded-md bg-soft ${className}`} />;
  return <div className={`svg-box overflow-hidden rounded-md ${className}`} dangerouslySetInnerHTML={{ __html: asset.markup }} />;
}

export function SvgPicker({ value, svgs, onChange }: { value?: string | null; svgs: SvgAsset[]; onChange: (id: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const current = svgs.find((s) => s.id === value);

  const categories = useMemo(() => [...new Set(svgs.flatMap((s) => s.tags ?? []))].sort(), [svgs]);
  const filtered = svgs.filter((s) =>
    (!category || (s.tags ?? []).includes(category)) &&
    (!query.trim() || s.name.toLowerCase().includes(query.trim().toLowerCase())),
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-16 items-center gap-2.5 rounded-lg border border-line p-2">
        <SvgThumb asset={current} className="h-[46px] w-16 shrink-0" />
        <span className="truncate text-ink">{current?.name ?? "None"}</span>
        <button type="button" className="ml-auto text-primary" onClick={() => setOpen(true)}>Pick from library</button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" onClick={() => setOpen(false)}>
          <div className="flex max-h-[80vh] w-full max-w-3xl flex-col gap-4 rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <strong className="text-lg">Choose an icon</strong>
              <button className="ml-auto text-muted" onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </div>
            <input className="input" placeholder="Search icons…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
            {categories.length ? (
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => setCategory(null)} className={`h-8 rounded-full px-3 text-xs font-medium ${!category ? "bg-primary text-white" : "bg-ground text-muted"}`}>All</button>
                {categories.map((c) => (
                  <button key={c} type="button" onClick={() => setCategory(c)} className={`h-8 rounded-full px-3 text-xs font-medium ${category === c ? "bg-primary text-white" : "bg-ground text-muted"}`}>{c}</button>
                ))}
              </div>
            ) : null}
            <div className="grid grid-cols-4 gap-2.5 overflow-y-auto sm:grid-cols-6">
              <button type="button" onClick={() => { onChange(null); setOpen(false); }} className="flex aspect-[4/3] items-center justify-center rounded-md border border-dashed border-line text-xs">None</button>
              {filtered.map((s) => (
                <button type="button" key={s.id} title={s.name} onClick={() => { onChange(s.id); setOpen(false); }}
                  className={`rounded-md border-2 ${s.id === value ? "border-primary" : "border-transparent"}`}>
                  <SvgThumb asset={s} className="aspect-[4/3] w-full" />
                </button>
              ))}
              {!filtered.length ? <p className="col-span-full py-6 text-center text-sm text-muted">No icons match.</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
