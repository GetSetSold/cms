"use client";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BlockListEditor } from "./BlockListEditor";
import type { BlogCategory, CmsForm, SvgAsset } from "@/lib/types";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
type BlockType = { key: string; name: string; category: string; default_data: Record<string, any> };

function CategoryRow({
  cat, blockTypes, svgs, forms, onSaved, onDeleted, canUp, canDown, onMove,
}: {
  cat: BlogCategory; blockTypes: BlockType[]; svgs: SvgAsset[]; forms: CmsForm[];
  onSaved: (c: BlogCategory) => void; onDeleted: () => void; canUp: boolean; canDown: boolean; onMove: (dir: -1 | 1) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [c, setC] = useState(cat);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const set = <K extends keyof BlogCategory>(k: K, v: BlogCategory[K]) => setC((x) => ({ ...x, [k]: v }));

  async function save() {
    const row = { name: c.name, slug: slugify(c.slug || c.name), description: c.description, template_blocks_before: c.template_blocks_before, template_blocks_after: c.template_blocks_after };
    const { error } = await supabase.from("blog_categories").update(row).eq("id", c.id);
    setMsg(error ? error.message : "Saved");
    if (!error) { onSaved({ ...c, slug: row.slug }); set("slug", row.slug); }
  }
  async function remove() {
    if (!confirm(`Delete category "${c.name}"? Posts in it will become uncategorized.`)) return;
    await supabase.from("blog_categories").delete().eq("id", c.id);
    onDeleted();
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4">
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <button type="button" aria-label="Move up" disabled={!canUp} onClick={() => onMove(-1)} className="h-5 text-muted disabled:opacity-30">↑</button>
          <button type="button" aria-label="Move down" disabled={!canDown} onClick={() => onMove(1)} className="h-5 text-muted disabled:opacity-30">↓</button>
        </div>
        <input className="input w-52" value={c.name} onChange={(e) => set("name", e.target.value)} />
        <span className="text-sm text-muted">/updates/{c.slug}</span>
        <button type="button" onClick={() => setOpen(!open)} className="ml-auto text-sm text-primary">{open ? "Close" : "Edit template"}</button>
        <button type="button" onClick={save} className="btn h-8 px-3 text-xs">Save</button>
        <button type="button" onClick={remove} className="text-sm text-red-700">Delete</button>
      </div>
      {msg ? <span className="text-xs text-muted">{msg}</span> : null}
      {open ? (
        <div className="flex flex-col gap-4 border-t border-line pt-3">
          <label className="label">URL slug<input className="input" value={c.slug} onChange={(e) => set("slug", e.target.value)} /></label>
          <label className="label">Description<textarea rows={2} className="textarea" value={c.description ?? ""} onChange={(e) => set("description", e.target.value)} /></label>
          <BlockListEditor label="Default blocks before the writing area" blocks={c.template_blocks_before} blockTypes={blockTypes} svgs={svgs} forms={forms} onChange={(b) => set("template_blocks_before", b)} />
          <BlockListEditor label="Default blocks after the writing area" blocks={c.template_blocks_after} blockTypes={blockTypes} svgs={svgs} forms={forms} onChange={(b) => set("template_blocks_after", b)} />
        </div>
      ) : null}
    </div>
  );
}

export function CategoriesManager({ initial, blockTypes, svgs, forms }: { initial: BlogCategory[]; blockTypes: BlockType[]; svgs: SvgAsset[]; forms: CmsForm[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [cats, setCats] = useState(initial);
  const [name, setName] = useState("");

  async function addCategory() {
    if (!name.trim()) return;
    const { data, error } = await supabase.from("blog_categories").insert({ name, slug: slugify(name), sort_order: cats.length }).select("*").single();
    if (!error && data) { setCats([...cats, data as BlogCategory]); setName(""); }
  }
  async function move(i: number, dir: -1 | 1) {
    const next = [...cats];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    setCats(next);
    await Promise.all(next.map((c, idx) => supabase.from("blog_categories").update({ sort_order: idx }).eq("id", c.id)));
  }

  return (
    <div className="flex flex-col gap-3">
      {cats.map((c, i) => (
        <CategoryRow key={c.id} cat={c} blockTypes={blockTypes} svgs={svgs} forms={forms}
          onSaved={(nc) => setCats(cats.map((x) => (x.id === nc.id ? nc : x)))}
          onDeleted={() => setCats(cats.filter((x) => x.id !== c.id))}
          canUp={i > 0} canDown={i < cats.length - 1} onMove={(dir) => move(i, dir)} />
      ))}
      <div className="flex gap-2">
        <input className="input" placeholder="New category name (e.g. Bank of Canada)" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn-primary" onClick={addCategory}>+ Add category</button>
      </div>
    </div>
  );
}
