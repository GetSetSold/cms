"use client";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sanitizeSvg } from "@/lib/svg";
import type { SvgAsset } from "@/lib/types";
import { SvgThumb } from "./SvgPicker";

function EditSvgModal({ asset, onClose, onSaved }: { asset: SvgAsset; onClose: () => void; onSaved: (a: SvgAsset) => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [markup, setMarkup] = useState(asset.markup);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true); setError("");
    let clean: string;
    try { clean = sanitizeSvg(markup); } catch (e) { setSaving(false); return setError((e as Error).message); }
    const { data, error } = await supabase.from("svg_assets").update({ markup: clean }).eq("id", asset.id).select("id,name,markup,tags").single();
    setSaving(false);
    if (error) return setError(error.message.includes("svg_is_safe") ? "This SVG contains unsafe content and was rejected." : error.message);
    onSaved(data as SvgAsset);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col gap-4 rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <strong className="text-lg">Edit {asset.name}</strong>
          <button className="ml-auto text-muted" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="grid flex-1 gap-4 overflow-hidden md:grid-cols-[220px_1fr]">
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted">Live preview</span>
            <div className="svg-box aspect-square rounded-xl border border-line p-4" dangerouslySetInnerHTML={{ __html: (() => { try { return sanitizeSvg(markup); } catch { return ""; } })() }} />
          </div>
          <textarea
            className="textarea flex-1 resize-none font-mono text-xs"
            value={markup}
            onChange={(e) => setMarkup(e.target.value)}
            spellCheck={false}
          />
        </div>
        {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
}

export function SvgLibrary({ initial }: { initial: SvgAsset[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState(initial);
  const [error, setError] = useState("");
  const [paste, setPaste] = useState("");
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<SvgAsset | null>(null);

  async function add(rawName: string, raw: string) {
    setError("");
    let markup: string;
    try { markup = sanitizeSvg(raw); } catch (e) { return setError((e as Error).message); }
    const { data, error } = await supabase.from("svg_assets").insert({ name: rawName || "Untitled", markup }).select("id,name,markup,tags").single();
    if (error) return setError(error.message.includes("svg_is_safe") ? "This SVG contains unsafe content and was rejected." : error.message);
    setItems((l) => [data as SvgAsset, ...l]);
    setPaste(""); setName("");
  }

  async function onFiles(files: FileList | null) {
    for (const f of Array.from(files ?? [])) {
      if (!f.name.toLowerCase().endsWith(".svg")) { setError(`${f.name} is not an SVG file.`); continue; }
      if (f.size > 200_000) { setError(`${f.name} is larger than 200 KB.`); continue; }
      await add(f.name.replace(/\.svg$/i, ""), await f.text());
    }
  }

  async function rename(id: string, newName: string) {
    await supabase.from("svg_assets").update({ name: newName }).eq("id", id);
  }

  async function remove(id: string) {
    if (!confirm("Delete this SVG? Sections using it will show nothing in its place.")) return;
    const { error } = await supabase.from("svg_assets").delete().eq("id", id);
    if (error) return setError(error.message);
    setItems((l) => l.filter((s) => s.id !== id));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="card flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed border-line text-center">
          <strong>Upload SVG files</strong>
          <span className="text-muted">Click to choose, max 200 KB each</span>
          <input type="file" accept=".svg,image/svg+xml" multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} />
        </label>
        <div className="card flex flex-col gap-3">
          <strong>…or paste SVG code</strong>
          <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <textarea className="textarea font-mono text-xs" rows={4} placeholder="<svg viewBox=…>" value={paste} onChange={(e) => setPaste(e.target.value)} />
          <button className="btn-primary self-start" disabled={!paste.trim()} onClick={() => add(name, paste)}>Add to library</button>
        </div>
      </div>
      {error ? <p className="rounded-lg bg-red-50 p-3 text-red-800" role="alert">{error}</p> : null}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        {items.map((s) => (
          <figure key={s.id} className="flex flex-col gap-2 rounded-xl bg-white p-3">
            <SvgThumb asset={s} className="aspect-[4/3] w-full" />
            <input className="input h-8 text-xs" defaultValue={s.name} onBlur={(e) => e.target.value !== s.name && rename(s.id, e.target.value)} aria-label="SVG name" />
            <div className="flex justify-between">
              <button className="text-xs text-primary" onClick={() => setEditing(s)}>Edit</button>
              <button className="text-xs text-red-700" onClick={() => remove(s.id)}>Delete</button>
            </div>
          </figure>
        ))}
      </div>
      {editing ? (
        <EditSvgModal
          asset={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => setItems((l) => l.map((s) => (s.id === updated.id ? updated : s)))}
        />
      ) : null}
    </div>
  );
}
