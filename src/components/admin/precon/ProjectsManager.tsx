"use client";
import { useState } from "react";
import type { Project, Builder } from "@/lib/precon";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function Form({ initial, builders, onSave, onCancel }: { initial: Partial<Project>; builders: Builder[]; onSave: (d: Partial<Project>) => void; onCancel: () => void }) {
  const [d, setD] = useState<Partial<Project>>(initial);
  const set = (k: keyof Project, v: any) => setD((x) => ({ ...x, [k]: v }));
  return (
    <div className="card flex max-w-3xl flex-col gap-3">
      <strong className="text-base">{initial.id ? "Edit project" : "Add project"}</strong>
      <div className="grid grid-cols-2 gap-3">
        <label className="label">Builder
          <select className="input" value={d.builder_id ?? ""} onChange={(e) => set("builder_id", Number(e.target.value))}>
            <option value="">Select…</option>
            {builders.map((b) => <option key={b.id} value={b.id}>{b.builder_name}</option>)}
          </select>
        </label>
        <label className="label">Status (free text, e.g. Selling)<input className="input" value={d.project_status ?? ""} onChange={(e) => set("project_status", e.target.value)} /></label>
      </div>
      <label className="label">Project name<input className="input" value={d.project_name ?? ""} onChange={(e) => { set("project_name", e.target.value); if (!initial.id) set("slug", slugify(e.target.value)); }} /></label>
      <label className="label">URL slug<input className="input" value={d.slug ?? ""} onChange={(e) => set("slug", slugify(e.target.value))} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="label">City<input className="input" value={d.city ?? ""} onChange={(e) => set("city", e.target.value)} /></label>
        <label className="label">Starting price<input className="input" value={d.p_start_price ?? ""} onChange={(e) => set("p_start_price", e.target.value)} /></label>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <label className="label">Beds<input className="input" value={d.beds ?? ""} onChange={(e) => set("beds", e.target.value)} /></label>
        <label className="label">Baths<input className="input" value={d.baths ?? ""} onChange={(e) => set("baths", e.target.value)} /></label>
        <label className="label">Sqft (range OK, e.g. "1396 - 1687")<input className="input" value={d.sqft ?? ""} onChange={(e) => set("sqft", e.target.value)} /></label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="label">Latitude<input className="input" type="number" step="any" value={d.lat ?? ""} onChange={(e) => set("lat", e.target.value === "" ? null : Number(e.target.value))} /></label>
        <label className="label">Longitude<input className="input" type="number" step="any" value={d.lng ?? ""} onChange={(e) => set("lng", e.target.value === "" ? null : Number(e.target.value))} /></label>
      </div>
      <label className="label">VIP release
        <select className="input" value={d.vip_release ?? ""} onChange={(e) => set("vip_release", e.target.value)}>
          <option value="">—</option><option value="Yes">Yes</option><option value="No">No</option>
        </select>
      </label>
      <label className="label">Main image URL<input className="input" value={d.main_image_url ?? ""} onChange={(e) => set("main_image_url", e.target.value)} /></label>
      <label className="label">Project message (marketing blurb)<textarea className="textarea" rows={3} value={d.project_message ?? ""} onChange={(e) => set("project_message", e.target.value)} /></label>
      <label className="label">Description<textarea className="textarea" rows={3} value={d.project_description ?? ""} onChange={(e) => set("project_description", e.target.value)} /></label>
      <div className="flex gap-2"><button className="btn" onClick={onCancel}>Cancel</button><button className="btn-primary" onClick={() => onSave(d)} disabled={!d.project_name?.trim() || !d.slug?.trim() || !d.builder_id}>Save</button></div>
    </div>
  );
}

export function ProjectsManager({ initial, builders }: { initial: Project[]; builders: Builder[] }) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Partial<Project> | null>(null);
  const [error, setError] = useState("");
  const builderName = (id: number) => builders.find((b) => b.id === id)?.builder_name ?? "—";

  async function save(d: Partial<Project>) {
    setError("");
    const res = await fetch(d.id ? `/api/admin/precon/projects/${d.id}` : "/api/admin/precon/projects", {
      method: d.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d),
    });
    const body = await res.json();
    if (!res.ok) return setError(body.error || "Something went wrong.");
    const saved = body.project as Project;
    setRows(d.id ? rows.map((r) => (r.id === d.id ? saved : r)) : [...rows, saved]);
    setEditing(null);
  }
  async function remove(id: string) {
    if (!confirm("Delete this project?")) return;
    const res = await fetch(`/api/admin/precon/projects/${id}`, { method: "DELETE" });
    if (!res.ok) return setError((await res.json()).error || "Could not delete.");
    setRows(rows.filter((r) => r.id !== id));
  }

  return (
    <div className="flex flex-col gap-5">
      <button className="btn-primary self-start" onClick={() => setEditing({})}>+ Add project</button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {editing ? <Form initial={editing} builders={builders} onCancel={() => setEditing(null)} onSave={save} /> : null}
      <div className="overflow-hidden rounded-2xl bg-white">
        <table className="w-full text-left">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted"><tr><th className="p-4">Project</th><th className="p-4">Builder</th><th className="p-4">City</th><th className="p-4">Status</th><th className="p-4"></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line/60 last:border-0">
                <td className="p-4 font-medium">{r.project_name}</td>
                <td className="p-4 text-muted">{builderName(r.builder_id)}</td>
                <td className="p-4 text-muted">{r.city}</td>
                <td className="p-4 text-muted">{r.project_status}</td>
                <td className="p-4"><div className="flex gap-3 text-xs"><button className="font-medium text-primary" onClick={() => setEditing(r)}>Edit</button><button className="font-medium text-red-700" onClick={() => remove(r.id)}>Delete</button></div></td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={5} className="p-8 text-center text-muted">No projects yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
