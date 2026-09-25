"use client";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SvgPicker } from "./SvgPicker";
import type { BlogAuthor, SvgAsset } from "@/lib/types";

function AuthorRow({ author, svgs, onSaved, onDeleted }: { author: BlogAuthor; svgs: SvgAsset[]; onSaved: (a: BlogAuthor) => void; onDeleted: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [a, setA] = useState(author);
  const [msg, setMsg] = useState("");
  const set = <K extends keyof BlogAuthor>(k: K, v: BlogAuthor[K]) => setA((x) => ({ ...x, [k]: v }));

  async function save() {
    const { error } = await supabase.from("blog_authors").update({ name: a.name, role: a.role, bio: a.bio, avatar_svg_id: a.avatar_svg_id }).eq("id", a.id);
    setMsg(error ? error.message : "Saved");
    if (!error) onSaved(a);
  }
  async function remove() {
    if (!confirm(`Delete author "${a.name}"? Posts by them will show no author.`)) return;
    await supabase.from("blog_authors").delete().eq("id", a.id);
    onDeleted();
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="label">Name<input className="input" value={a.name} onChange={(e) => set("name", e.target.value)} /></label>
        <label className="label">Role<input className="input" value={a.role ?? ""} onChange={(e) => set("role", e.target.value)} /></label>
      </div>
      <label className="label">Bio<textarea rows={2} className="textarea" value={a.bio ?? ""} onChange={(e) => set("bio", e.target.value)} /></label>
      <div className="label">Avatar<SvgPicker value={a.avatar_svg_id} svgs={svgs} onChange={(id) => set("avatar_svg_id", id)} /></div>
      <div className="flex items-center gap-3">
        {msg ? <span className="text-xs text-muted">{msg}</span> : null}
        <button type="button" onClick={save} className="btn h-8 px-3 text-xs">Save</button>
        <button type="button" onClick={remove} className="text-sm text-red-700">Delete</button>
      </div>
    </div>
  );
}

export function AuthorsManager({ initial, svgs }: { initial: BlogAuthor[]; svgs: SvgAsset[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [authors, setAuthors] = useState(initial);
  const [name, setName] = useState("");

  async function add() {
    if (!name.trim()) return;
    const { data, error } = await supabase.from("blog_authors").insert({ name }).select("*").single();
    if (!error && data) { setAuthors([...authors, data as BlogAuthor]); setName(""); }
  }

  return (
    <div className="flex flex-col gap-3">
      {authors.map((a) => (
        <AuthorRow key={a.id} author={a} svgs={svgs}
          onSaved={(na) => setAuthors(authors.map((x) => (x.id === na.id ? na : x)))}
          onDeleted={() => setAuthors(authors.filter((x) => x.id !== a.id))} />
      ))}
      <div className="flex gap-2">
        <input className="input" placeholder="New author name" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn-primary" onClick={add}>+ Add author</button>
      </div>
    </div>
  );
}
