"use client";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sanitizeSvg } from "@/lib/svg";
import type { SvgAsset } from "@/lib/types";
import { SvgThumb } from "./SvgPicker";

export function SvgLibrary({ initial }: { initial: SvgAsset[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState(initial);
  const [error, setError] = useState("");
  const [paste, setPaste] = useState("");
  const [name, setName] = useState("");

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
            <button className="self-end text-xs text-red-700" onClick={() => remove(s.id)}>Delete</button>
          </figure>
        ))}
      </div>
    </div>
  );
}
