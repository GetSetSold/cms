"use client";
import { useEffect, useRef, useState } from "react";
import type { Field } from "@/lib/block-fields";
import type { SvgAsset, CmsForm } from "@/lib/types";
import { SvgPicker } from "./SvgPicker";

function TextareaWithLink({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [pages, setPages] = useState<{ title: string; url: string; group: string }[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [open, setOpen] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [search, setSearch] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = search.trim()
    ? pages.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()) || p.url.toLowerCase().includes(search.toLowerCase()))
    : pages;

  // Group filtered pages
  const groups: { name: string; items: typeof pages }[] = [];
  for (const p of filtered) {
    let g = groups.find((x) => x.name === p.group);
    if (!g) { g = { name: p.group, items: [] }; groups.push(g); }
    g.items.push(p);
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open ]);

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
    const text = linkText.trim() || title || url;
    const md = `[${text}](${url})`;
    const ta = textareaRef.current;
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
    setLinkText("");
    setCustomUrl("");
  }

  return (
    <div className="label">
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <div className="relative" ref={wrapRef}>
          <button type="button" onClick={open ? () => setOpen(false) : openPicker} className="text-xs text-[#0099cc] underline">
            {open ? "Close" : "+ Insert link"}
          </button>
          {open ? (
            <div className="absolute right-0 z-50 mt-1 w-72 rounded-lg border border-line bg-white p-3 shadow-lg">
              <input value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder="Link text (optional)"
                className="mb-2 w-full rounded border border-line px-2 py-1 text-sm" />
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
      </div>
      <textarea ref={textareaRef} rows={3} className="textarea" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted">Tip: [link text](/page-url) creates a link</span>
        {value?.includes("](") ? (
          <button type="button" onClick={() => setShowPreview(!showPreview)} className="text-[11px] text-[#0099cc] underline">
            {showPreview ? "Hide preview" : "Preview links"}
          </button>
        ) : null}
      </div>
      {showPreview && value?.includes("](") ? (
        <div className="rounded-lg border border-line bg-gray-50 p-3 text-sm">
          {value.split(/\n{2,}/).filter(Boolean).map((p, i) => (
            <p key={i} className="mb-2 last:mb-0" dangerouslySetInnerHTML={{
              __html: p.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#0099cc;text-decoration:underline">$1</a>')
            }} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

type Props = { fields: Field[]; value: Record<string, any>; onChange: (v: Record<string, any>) => void; svgs: SvgAsset[]; forms?: CmsForm[] };

export function FieldEditor({ fields, value, onChange, svgs, forms = [] }: Props) {
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v });

  return (
    <div className="flex flex-col gap-4">
      {fields.map((f) => {
        const v = value?.[f.key];
        switch (f.type) {
          case "text":
            return <label key={f.key} className="label">{f.label}<input className="input" value={v ?? ""} onChange={(e) => set(f.key, e.target.value)} /></label>;
          case "textarea":
            return (
              <TextareaWithLink key={f.key} label={f.label} value={v ?? ""} onChange={(val) => set(f.key, val)} />
            );
          case "code":
            return <label key={f.key} className="label">{f.label}<textarea rows={12} className="textarea font-mono text-xs" spellCheck={false} value={v ?? ""} onChange={(e) => set(f.key, e.target.value)} /></label>;
          case "boolean":
            return (
              <label key={f.key} className="flex items-center justify-between gap-3">
                {f.label}<input type="checkbox" checked={v !== false} onChange={(e) => set(f.key, e.target.checked)} />
              </label>
            );
          case "select":
            return (
              <label key={f.key} className="label">{f.label}
                <select className="input" value={v ?? f.options[0]} onChange={(e) => set(f.key, e.target.value)}>
                  {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
            );
          case "svg":
            return <div key={f.key} className="label">{f.label}<SvgPicker value={v} svgs={svgs} onChange={(id) => set(f.key, id)} /></div>;
          case "form":
            return (
              <label key={f.key} className="label">{f.label}
                <select className="input" value={v ?? ""} onChange={(e) => set(f.key, e.target.value)}>
                  <option value="">None</option>
                  {forms.map((form) => <option key={form.slug} value={form.slug}>{form.name}</option>)}
                </select>
              </label>
            );
          case "color":
            return (
              <div key={f.key} className="label">{f.label}
                <div className="flex items-center gap-2">
                  <input type="color" value={v || "#ffffff"} onChange={(e) => set(f.key, e.target.value)} className="h-8 w-9 cursor-pointer rounded border-0 bg-transparent" />
                  <span className="font-mono text-xs text-ink">{v || "default"}</span>
                  {v ? <button type="button" className="ml-auto text-xs text-muted" onClick={() => set(f.key, "")}>Reset</button> : null}
                </div>
              </div>
            );
          case "link":
            // Used to be a 2-column grid — fine on a wide screen, but this panel is a fixed 340px,
            // so each input landed in a ~160px column: cramped for anything longer than a few
            // characters (a real button label, a real URL) and part of what made the panel feel like
            // it needed to scroll sideways to work with. Stacked, each field gets the full width.
            return (
              <div key={f.key} className="flex flex-col gap-2">
                <label className="label">{f.label}<input className="input" value={v?.label ?? ""} onChange={(e) => set(f.key, { ...v, label: e.target.value })} /></label>
                <label className="label">Links to<input className="input" value={v?.href ?? ""} placeholder="/contact or #quote" onChange={(e) => set(f.key, { ...v, href: e.target.value })} /></label>
              </div>
            );
          case "strings":
            return (
              <label key={f.key} className="label">{f.label} (one per line)
                <textarea rows={4} className="textarea" value={(v ?? []).join("\n")} onChange={(e) => set(f.key, e.target.value.split("\n"))} />
              </label>
            );
          case "group":
            return (
              <fieldset key={f.key} className="flex min-w-0 flex-col gap-3 rounded-lg border border-line p-3">
                <legend className="px-1 text-[13px] text-muted">{f.label}</legend>
                <FieldEditor fields={f.fields} value={v ?? {}} onChange={(nv) => set(f.key, nv)} svgs={svgs} forms={forms} />
              </fieldset>
            );
          case "list": {
            const items: any[] = Array.isArray(v) ? v : [];
            const update = (next: any[]) => set(f.key, next);
            return (
              <fieldset key={f.key} className="flex min-w-0 flex-col gap-3">
                <legend className="mb-2 text-[13px] text-muted">{f.label}</legend>
                {items.map((item, i) => (
                  <details key={i} className="rounded-lg border border-line" open={items.length <= 2}>
                    <summary className="flex cursor-pointer items-center gap-2 px-3 py-2">
                      {/* min-w-0 is required for truncate to actually work on a flex child — without
                         it the span just grows to fit a long title (e.g. a full reason/phase title)
                         and spills past the panel's edge instead of ellipsizing, which is exactly
                         what was happening with longer, more realistic content. */}
                      <span className="min-w-0 truncate font-medium">{item.title || item.name || item.q || item.value || `${f.itemLabel} ${i + 1}`}</span>
                      <span className="ml-auto flex gap-1 text-muted">
                        <button type="button" aria-label="Move up" disabled={i === 0} onClick={(e) => { e.preventDefault(); const n = [...items]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; update(n); }}>↑</button>
                        <button type="button" aria-label="Move down" disabled={i === items.length - 1} onClick={(e) => { e.preventDefault(); const n = [...items]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; update(n); }}>↓</button>
                        <button type="button" aria-label="Remove" onClick={(e) => { e.preventDefault(); update(items.filter((_, j) => j !== i)); }}>✕</button>
                      </span>
                    </summary>
                    <div className="border-t border-line p-3">
                      <FieldEditor fields={f.fields} value={item} onChange={(nv) => update(items.map((x, j) => (j === i ? nv : x)))} svgs={svgs} forms={forms} />
                    </div>
                  </details>
                ))}
                <button type="button" className="btn border-dashed" onClick={() => update([...items, {}])}>+ Add {f.itemLabel.toLowerCase()}</button>
              </fieldset>
            );
          }
        }
      })}
    </div>
  );
}
