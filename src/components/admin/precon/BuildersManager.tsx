"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Builder = {
  id: string; slug: string; name: string; logo_url: string | null; tagline: string | null;
  description: string | null; incentive_title: string | null; incentive_description: string | null; is_active: boolean;
};

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function Form({ initial, onSave, onCancel }: { initial: Partial<Builder>; onSave: (d: Partial<Builder>) => void; onCancel: () => void }) {
  const [d, setD] = useState<Partial<Builder>>(initial);
  const set = (k: keyof Builder, v: any) => setD((x) => ({ ...x, [k]: v }));
  return (
    <div className="card flex max-w-2xl flex-col gap-3">
      <strong className="text-base">{initial.id ? "Edit builder" : "Add builder"}</strong>
      <label className="label">Name<input className="input" value={d.name ?? ""} onChange={(e) => { set("name", e.target.value); if (!initial.id) set("slug", slugify(e.target.value)); }} /></label>
      <label className="label">URL slug (e.g. cachet-homes)<input className="input" value={d.slug ?? ""} onChange={(e) => set("slug", slugify(e.target.value))} /></label>
      <label className="label">Logo URL<input className="input" value={d.logo_url ?? ""} onChange={(e) => set("logo_url", e.target.value)} /></label>
      <label className="label">Tagline<input className="input" value={d.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} /></label>
      <label className="label">Description<textarea className="textarea" rows={3} value={d.description ?? ""} onChange={(e) => set("description", e.target.value)} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="label">Current incentive title<input className="input" value={d.incentive_title ?? ""} onChange={(e) => set("incentive_title", e.target.value)} /></label>
        <label className="label">Incentive description<input className="input" value={d.incentive_description ?? ""} onChange={(e) => set("incentive_description", e.target.value)} /></label>
      </div>
      <div className="flex gap-2"><button className="btn" onClick={onCancel}>Cancel</button><button className="btn-primary" onClick={() => onSave(d)} disabled={!d.name?.trim() || !d.slug?.trim()}>Save</button></div>
    </div>
  );
}

export function BuildersManager({ initial }: { initial: Builder[] }) {
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Partial<Builder> | null>(null);
  const [error, setError] = useState("");

  async function save(d: Partial<Builder>) {
    setError("");
    if (d.id) {
      const { data, error } = await supabase.from("precon_builders").update(d).eq("id", d.id).select("*").single();
      if (error) return setError(error.message);
      setRows(rows.map((r) => (r.id === d.id ? (data as Builder) : r)));
    } else {
      const { data, error } = await supabase.from("precon_builders").insert(d).select("*").single();
      if (error) return setError(error.message);
      setRows([...rows, data as Builder]);
    }
    setEditing(null);
  }
  async function remove(id: string) {
    if (!confirm("Delete this builder? Its projects and models will also be removed.")) return;
    await supabase.from("precon_builders").delete().eq("id", id);
    setRows(rows.filter((r) => r.id !== id));
  }

  return (
    <div className="flex flex-col gap-5">
      <button className="btn-primary self-start" onClick={() => setEditing({})}>+ Add builder</button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {editing ? <Form initial={editing} onCancel={() => setEditing(null)} onSave={save} /> : null}
      <div className="overflow-hidden rounded-2xl bg-white">
        <table className="w-full text-left">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted"><tr><th className="p-4">Name</th><th className="p-4">Slug</th><th className="p-4"></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line/60 last:border-0">
                <td className="p-4 font-medium">{r.name}</td>
                <td className="p-4 text-muted">/{r.slug}</td>
                <td className="p-4"><div className="flex gap-3 text-xs"><button className="font-medium text-primary" onClick={() => setEditing(r)}>Edit</button><button className="font-medium text-red-700" onClick={() => remove(r.id)}>Delete</button></div></td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={3} className="p-8 text-center text-muted">No builders yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
