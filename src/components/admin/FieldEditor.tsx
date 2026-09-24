"use client";
import type { Field } from "@/lib/block-fields";
import type { SvgAsset, CmsForm } from "@/lib/types";
import { SvgPicker } from "./SvgPicker";

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
            return <label key={f.key} className="label">{f.label}<textarea rows={3} className="textarea" value={v ?? ""} onChange={(e) => set(f.key, e.target.value)} /></label>;
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
            return (
              <div key={f.key} className="grid grid-cols-2 gap-2">
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
              <fieldset key={f.key} className="flex flex-col gap-3 rounded-lg border border-line p-3">
                <legend className="px-1 text-[13px] text-muted">{f.label}</legend>
                <FieldEditor fields={f.fields} value={v ?? {}} onChange={(nv) => set(f.key, nv)} svgs={svgs} forms={forms} />
              </fieldset>
            );
          case "list": {
            const items: any[] = Array.isArray(v) ? v : [];
            const update = (next: any[]) => set(f.key, next);
            return (
              <fieldset key={f.key} className="flex flex-col gap-3">
                <legend className="mb-2 text-[13px] text-muted">{f.label}</legend>
                {items.map((item, i) => (
                  <details key={i} className="rounded-lg border border-line" open={items.length <= 2}>
                    <summary className="flex cursor-pointer items-center gap-2 px-3 py-2">
                      <span className="truncate font-medium">{item.title || item.name || item.q || item.value || `${f.itemLabel} ${i + 1}`}</span>
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
