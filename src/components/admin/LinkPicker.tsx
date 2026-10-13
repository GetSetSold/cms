"use client";
import { useEffect, useRef, useState } from "react";

/** Link picker: search CMS pages or enter a custom URL, inserts [text](url) at cursor. */
export function LinkPicker({
  textareaRef,
  value,
  onChange,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (v: string) => void;
}) {
  const [pages, setPages] = useState<{ title: string; url: string; group: string }[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [open, setOpen] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const [search, setSearch] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = search.trim()
    ? pages.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()) || p.url.toLowerCase().includes(search.toLowerCase()))
    : pages;

  const groups: { name: string; items: typeof pages }[] = [];
  for (const p of filtered) {
    let g = groups.find((x) => x.name === p.group);
    if (!g) { g = { name: p.group, items: [] }; groups.push(g); }
    g.items.push(p);
  }

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function openPicker() {
    if (!pages.length && !loadError) {
      try {
        const r = await fetch("/api/admin/pages-list");
        const d = await r.json();
        if (d.pages) setPages(d.pages);
        else setLoadError(true);
      } catch { setLoadError(true); }
    }
    setOpen(true);
  }

  function insertLink(url: string, title: string) {
    const ta = textareaRef.current;
    const selected = ta ? value.slice(ta.selectionStart ?? 0, ta.selectionEnd ?? 0).trim() : "";
    const text = selected || title || url;
    const md = `[${text}](${url})`;
    if (ta) {
      const start = ta.selectionStart ?? value.length;
      const end = ta.selectionEnd ?? value.length;
      const next = value.slice(0, start) + md + value.slice(end);
      onChange(next);
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(start + md.length, start + md.length);
      }, 0);
    } else {
      onChange((value ? value + " " : "") + md);
    }
    setOpen(false);
    setCustomUrl("");
    setSearch("");
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button type="button" onClick={open ? () => setOpen(false) : openPicker}
        className="flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-xs font-medium hover:bg-white" title="Insert link">
        Link
      </button>
      {open ? (
        <div className="absolute left-0 z-50 mt-1 w-72 rounded-lg border border-line bg-white p-3 shadow-lg">
          <div className="mb-2 flex gap-1">
            <input value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="https://… for external link"
              className="min-w-0 flex-1 rounded border border-line px-2 py-1 text-sm" />
            <button type="button" disabled={!customUrl.trim()}
              onClick={() => insertLink(customUrl.trim(), customUrl.trim())}
              className="shrink-0 rounded bg-ink px-2 py-1 text-xs text-white disabled:opacity-40">
              Add
            </button>
          </div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search pages…"
            className="mb-2 w-full rounded border border-line px-2 py-1 text-sm" />
          <div className="max-h-56 overflow-y-auto border-t border-line pt-1">
            {loadError ? (
              <p className="px-2 py-1 text-sm text-muted">Couldn&apos;t load pages — use a manual URL above.</p>
            ) : filtered.length === 0 ? (
              <p className="px-2 py-1 text-sm text-muted">{pages.length === 0 ? "Loading…" : "No matches."}</p>
            ) : groups.map((g) => (
              <div key={g.name}>
                <p className="px-2 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{g.name}</p>
                {g.items.map((p) => (
                  <button key={p.url} type="button"
                    onClick={() => insertLink(p.url, p.title)}
                    className="block w-full truncate px-2 py-1 text-left text-sm hover:bg-gray-50"
                    title={p.url}>
                    {p.title}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
