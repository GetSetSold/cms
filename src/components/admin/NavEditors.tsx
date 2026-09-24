"use client";
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

export function NavItemEditor({ item, onChange, onRemove, onMoveUp, canMoveUp }: {
  item: NavItem; onChange: (n: NavItem) => void; onRemove: () => void; onMoveUp: () => void; canMoveUp: boolean;
}) {
  const hasMega = !!item.columns?.length;
  const setColumn = (i: number, c: NavColumn) => onChange({ ...item, columns: (item.columns ?? []).map((x, j) => (j === i ? c : x)) });

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line p-3">
      <div className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-2">
        <input className="input" placeholder="Label" value={item.label} onChange={(e) => onChange({ ...item, label: e.target.value })} />
        <input className="input" placeholder="/about" value={item.href} onChange={(e) => onChange({ ...item, href: e.target.value })} />
        <button type="button" aria-label="Move up" disabled={!canMoveUp} onClick={onMoveUp}>↑</button>
        <button type="button" aria-label="Remove" onClick={onRemove}>✕</button>
      </div>
      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={hasMega} onChange={(e) => onChange({ ...item, columns: e.target.checked ? [{ links: [{ label: "", href: "" }] }] : undefined })} />
        Mega menu (dropdown with link columns)
      </label>
      {hasMega ? (
        <div className="flex flex-col gap-2 pl-2">
          {(item.columns ?? []).map((col, i) => (
            <ColumnEditor key={i} column={col} onChange={(c) => setColumn(i, c)} onRemove={() => onChange({ ...item, columns: (item.columns ?? []).filter((_, j) => j !== i) })} />
          ))}
          <button type="button" className="btn self-start border-dashed" onClick={() => onChange({ ...item, columns: [...(item.columns ?? []), { links: [{ label: "", href: "" }] }] })}>
            + Add column
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function FooterColumnsEditor({ columns, onChange }: { columns: NavColumn[]; onChange: (c: NavColumn[]) => void }) {
  const setColumn = (i: number, c: NavColumn) => onChange(columns.map((x, j) => (j === i ? c : x)));
  return (
    <div className="flex flex-col gap-3">
      {columns.map((col, i) => (
        <ColumnEditor key={i} column={col} onChange={(c) => setColumn(i, c)} onRemove={() => onChange(columns.filter((_, j) => j !== i))} />
      ))}
      <button type="button" className="btn self-start border-dashed" onClick={() => onChange([...columns, { heading: "", links: [{ label: "", href: "" }] }])}>
        + Add footer column
      </button>
    </div>
  );
}
