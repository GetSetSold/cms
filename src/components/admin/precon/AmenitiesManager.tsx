"use client";
import { useState } from "react";
import type { Amenity } from "@/lib/precon";

function Form({ initial, onSave, onCancel }: { initial: Partial<Amenity>; onSave: (d: Partial<Amenity>) => void; onCancel: () => void }) {
  const [d, setD] = useState<Partial<Amenity>>(initial);
  const set = (k: keyof Amenity, v: any) => setD((x) => ({ ...x, [k]: v }));
  return (
    <div className="card flex max-w-3xl flex-col gap-3">
      <strong className="text-base">{initial.id ? "Edit amenity" : "Add amenity"}</strong>
      <label className="label">Title<input className="input" value={d.title ?? ""} onChange={(e) => set("title", e.target.value)} /></label>
      <label className="label">Description<textarea className="textarea" rows={2} value={d.description ?? ""} onChange={(e) => set("description", e.target.value)} /></label>
      <label className="label">Icon URL<input className="input" value={d.icon_url ?? ""} onChange={(e) => set("icon_url", e.target.value)} /></label>
      <div className="flex gap-2">
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn-primary" onClick={() => onSave(d)} disabled={!d.title?.trim()}>Save</button>
      </div>
    </div>
  );
}

export function AmenitiesManager({ initial }: { initial: Amenity[] }) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Partial<Amenity> | null>(null);
  const [error, setError] = useState("");

  async function save(d: Partial<Amenity>) {
    setError("");
    const res = await fetch(d.id ? `/api/admin/precon/amenities/${d.id}` : "/api/admin/precon/amenities", {
      method: d.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d),
    });
    const body = await res.json();
    if (!res.ok) return setError(body.error || "Something went wrong.");
    const saved = body.amenity as Amenity;
    setRows(d.id ? rows.map((r) => (r.id === d.id ? saved : r)) : [...rows, saved].sort((a, b) => (a.title ?? "").localeCompare(b.title ?? "")));
    setEditing(null);
  }

  async function remove(id: string) {
    if (!confirm("Delete this amenity? It will be unassigned from all projects.")) return;
    const res = await fetch(`/api/admin/precon/amenities/${id}`, { method: "DELETE" });
    if (!res.ok) return setError((await res.json()).error || "Could not delete.");
    setRows(rows.filter((r) => r.id !== id));
  }

  return (
    <div className="flex flex-col gap-5">
      <button className="btn-primary self-start" onClick={() => setEditing({})}>+ Add amenity</button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {editing ? <Form initial={editing} onCancel={() => setEditing(null)} onSave={save} /> : null}
      <div className="overflow-hidden rounded-2xl bg-white">
        <table className="w-full text-left">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted"><tr><th className="p-4">Amenity</th><th className="p-4">Description</th><th className="p-4"></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line/60 last:border-0">
                <td className="p-4">
                  <div className="flex items-center gap-2.5">
                    {r.icon_url ? <img src={r.icon_url} alt="" className="h-6 w-6 rounded object-contain" /> : null}
                    <span className="font-medium">{r.title}</span>
                  </div>
                </td>
                <td className="p-4 text-muted">{r.description}</td>
                <td className="p-4"><div className="flex gap-3 text-xs"><button className="font-medium text-primary" onClick={() => setEditing(r)}>Edit</button><button className="font-medium text-red-700" onClick={() => remove(r.id)}>Delete</button></div></td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={3} className="p-8 text-center text-muted">No amenities yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
