"use client";
import { useState } from "react";

/** Searchable picker modal — pick one item from a library list. No long checkbox grids. */
export function LibraryPicker<T extends { id: string | number }>({
  title,
  items,
  renderItem,
  getSearchText,
  onPick,
  onClose,
}: {
  title: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  getSearchText: (item: T) => string;
  onPick: (item: T) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const filtered = q.trim()
    ? items.filter((i) => getSearchText(i).toLowerCase().includes(q.toLowerCase()))
    : items;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-ground" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-line p-4">
          <div className="mb-3 text-base font-bold">{title}</div>
          <input
            autoFocus
            className="input"
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { onPick(item); onClose(); }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white"
            >
              {renderItem(item)}
            </button>
          ))}
          {!filtered.length ? <p className="p-6 text-center text-sm text-muted">No matches.</p> : null}
        </div>
        <div className="border-t border-line p-3">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
