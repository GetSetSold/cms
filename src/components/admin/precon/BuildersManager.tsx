"use client";
import { useState } from "react";
import type { Builder } from "@/lib/precon";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function Form({ initial, onSave, onCancel }: { initial: Partial<Builder>; onSave: (d: Partial<Builder>) => void; onCancel: () => void }) {
  const [d, setD] = useState<Partial<Builder>>(initial);
  const set = (k: keyof Builder, v: any) => setD((x) => ({ ...x, [k]: v }));
  return (
    <div className="card flex max-w-2xl flex-col gap-3">
      <strong className="text-base">{initial.id ? "Edit builder" : "Add builder"}</strong>
      <label className="label">Name<input className="input" value={d.builder_name ?? ""} onChange={(e) => { set("builder_name", e.target.value); if (!initial.id) set("slug", slugify(e.target.value)); }} /></label>
      <label className="label">URL slug<input className="input" value={d.slug ?? ""} onChange={(e) => set("slug", slugify(e.target.value))} /></label>
      <label className="label">Logo URL<input className="input" value={d.logo_url ?? ""} onChange={(e) => set("logo_url", e.target.value)} /></label>
      <label className="label">Banner URL<input className="input" value={d.banner_url ?? ""} onChange={(e) => set("banner_url", e.target.value)} /></label>
      <label className="label">Description<textarea className="textarea" rows={4} value={d.description ?? ""} onChange={(e) => set("description", e.target.value)} /></label>
      <div className="flex gap-2"><button className="btn" onClick={onCancel}>Cancel</button><button className="btn-primary" onClick={() => onSave(d)} disabled={!d.builder_name?.trim() || !d.slug?.trim()}>Save</button></div>
    </div>
  );
}

export function BuildersManager({ initial }: { initial: Builder[] }) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Partial<Builder> | null>(null);
  const [error, setError] = useState("");

  async function save(d: Partial<Builder>) {
    setError("");
    const res = await fetch(d.id ? `/api/admin/precon/builders/${d.id}` : "/api/admin/precon/builders", {
      method: d.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d),
    });
    const body = await res.json();
    if (!res.ok) return setError(body.error || "Something went wrong.");
    const saved = body.builder as Builder;
    setRows(d.id ? rows.map((r) => (r.id === d.id ? saved : r)) : [...rows, saved]);
    setEditing(null);
  }
  async function remove(id: number) {
    if (!confirm("Delete this builder?")) return;
    const res = await fetch(`/api/admin/precon/builders/${id}`, { method: "DELETE" });
    if (!res.ok) return setError((await res.json()).error || "Could not delete.");
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
                <td className="p-4 font-medium">{r.builder_name}</td>
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
