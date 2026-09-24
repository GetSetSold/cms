"use client";
import { useState } from "react";
import type { NavColumn, NavItem } from "@/lib/types";

function ColumnEditor({ column, onChange, onRemove }: { column: NavColumn; onChange: (c: NavColumn) => void; onRemove: () => void }) {
  const setLink = (i: number, patch: Partial<{ label: string; href: string }>) =>
    onChange({ ...column, links: column.links.map((l, j) => (j === i ? { ...l, ...patch } : l)) });

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line p-3">
      <div className="flex items-center gap-2">
        <input className="input" placeholder="Column heading (optional)" value={column.heading ?? ""} onChange={(e) => onChange({ ...column, heading: e.target.value })} />
        <button type="button" className="shrink-0 text-sm text-red-700" onClick={onRemove}>Remove column</button>
      </div>
      {column.links.map((l, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <input className="input" placeholder="Label" value={l.label} onChange={(e) => setLink(i, { label: e.target.value })} />
          <input className="input" placeholder="/services/roofing" value={l.href} onChange={(e) => setLink(i, { href: e.target.value })} />
          <button type="button" aria-label="Remove link" onClick={() => onChange({ ...column, links: column.links.filter((_, j) => j !== i) })}>✕</button>
        </div>
      ))}
      <button type="button" className="btn self-start border-dashed" onClick={() => onChange({ ...column, links: [...column.links, { label: "", href: "" }] })}>+ Add link</button>
    </div>
  );
}

function ReorderButtons({ onUp, onDown, canUp, canDown }: { onUp: () => void; onDown: () => void; canUp: boolean; canDown: boolean }) {
  return (
    <div className="flex shrink-0 flex-col">
      <button type="button" aria-label="Move up" disabled={!canUp} onClick={onUp} className="flex h-5 w-6 items-center justify-center text-muted hover:text-ink disabled:opacity-30">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 15 6-6 6 6" /></svg>
      </button>
      <button type="button" aria-label="Move down" disabled={!canDown} onClick={onDown} className="flex h-5 w-6 items-center justify-center text-muted hover:text-ink disabled:opacity-30">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
      </button>
    </div>
  );
}

export function NavItemEditor({ item, onChange, onRemove, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: {
  item: NavItem; onChange: (n: NavItem) => void; onRemove: () => void;
  onMoveUp: () => void; onMoveDown: () => void; canMoveUp: boolean; canMoveDown: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hasMega = !!item.columns?.length;
  const setColumn = (i: number, c: NavColumn) => onChange({ ...item, columns: (item.columns ?? []).map((x, j) => (j === i ? c : x)) });

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line p-3">
      <div className="flex items-center gap-2">
        <ReorderButtons onUp={onMoveUp} onDown={onMoveDown} canUp={canMoveUp} canDown={canMoveDown} />
        <button type="button" onClick={() => setOpen(!open)} className="flex flex-1 items-center gap-2 text-left">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`}><path d="m9 6 6 6-6 6" /></svg>
          <span className="font-medium">{item.label || "(untitled)"}</span>
          <span className="text-sm text-muted">{item.href}</span>
          {hasMega ? <span className="ml-auto rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary">mega menu</span> : null}
        </button>
        <button type="button" aria-label="Remove" onClick={onRemove}>✕</button>
      </div>
      {open ? (
        <div className="flex flex-col gap-2 pl-8">
          <div className="grid grid-cols-2 gap-2">
            <input className="input" placeholder="Label" value={item.label} onChange={(e) => onChange({ ...item, label: e.target.value })} />
            <input className="input" placeholder="/about" value={item.href} onChange={(e) => onChange({ ...item, href: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={hasMega} onChange={(e) => onChange({ ...item, columns: e.target.checked ? [{ links: [{ label: "", href: "" }] }] : undefined })} />
            Mega menu (dropdown with link columns)
          </label>
          {hasMega ? (
            <div className="flex flex-col gap-2">
              {(item.columns ?? []).map((col, i) => (
                <ColumnEditor key={i} column={col} onChange={(c) => setColumn(i, c)} onRemove={() => onChange({ ...item, columns: (item.columns ?? []).filter((_, j) => j !== i) })} />
              ))}
              <button type="button" className="btn self-start border-dashed" onClick={() => onChange({ ...item, columns: [...(item.columns ?? []), { links: [{ label: "", href: "" }] }] })}>
                + Add column
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function FooterRowsEditor({ rows, maxPerRow, onChange }: { rows: NavColumn[][]; maxPerRow: number; onChange: (r: NavColumn[][]) => void }) {
  const setRow = (ri: number, row: NavColumn[]) => onChange(rows.map((r, i) => (i === ri ? row : r)));
  const setColumn = (ri: number, ci: number, c: NavColumn) => setRow(ri, rows[ri].map((x, j) => (j === ci ? c : x)));
  const moveRow = (ri: number, dir: -1 | 1) => {
    const next = [...rows];
    [next[ri], next[ri + dir]] = [next[ri + dir], next[ri]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4">
      {rows.map((row, ri) => (
        <div key={ri} className="flex flex-col gap-2 rounded-xl bg-ground p-3">
          <div className="flex items-center gap-2 px-1">
            <ReorderButtons onUp={() => moveRow(ri, -1)} onDown={() => moveRow(ri, 1)} canUp={ri > 0} canDown={ri < rows.length - 1} />
            <strong className="text-xs uppercase tracking-wide text-muted">Row {ri + 1} · {row.length}/{maxPerRow} columns</strong>
            <button type="button" className="ml-auto text-sm text-red-700" onClick={() => onChange(rows.filter((_, i) => i !== ri))}>Remove row</button>
          </div>
          {row.map((col, ci) => (
            <ColumnEditor key={ci} column={col} onChange={(c) => setColumn(ri, ci, c)} onRemove={() => setRow(ri, row.filter((_, j) => j !== ci))} />
          ))}
          {row.length < maxPerRow ? (
            <button type="button" className="btn self-start border-dashed" onClick={() => setRow(ri, [...row, { heading: "", links: [{ label: "", href: "" }] }])}>
              + Add column to this row
            </button>
          ) : (
            <p className="px-1 text-xs text-muted">This row is full ({maxPerRow} columns) — add another row for more.</p>
          )}
        </div>
      ))}
      <button type="button" className="btn self-start border-dashed" onClick={() => onChange([...rows, [{ heading: "", links: [{ label: "", href: "" }] }]])}>
        + Add row
      </button>
    </div>
  );
}
