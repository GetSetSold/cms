"use client";
import { useState } from "react";
import type { HomeModel, Project } from "@/lib/precon";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function Form({ initial, projects, onSave, onCancel }: { initial: Partial<HomeModel>; projects: Project[]; onSave: (d: Partial<HomeModel>) => void; onCancel: () => void }) {
  const [d, setD] = useState<Partial<HomeModel>>(initial);
  const set = (k: keyof HomeModel, v: any) => setD((x) => ({ ...x, [k]: v }));
  return (
    <div className="card flex max-w-3xl flex-col gap-3">
      <strong className="text-base">{initial.id ? "Edit model" : "Add model"}</strong>
      <label className="label">Project
        <select className="input" value={d.project_id ?? ""} onChange={(e) => set("project_id", e.target.value)}>
          <option value="">Select…</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.project_name}</option>)}
        </select>
      </label>
      <label className="label">Model name<input className="input" value={d.model_name ?? ""} onChange={(e) => { set("model_name", e.target.value); if (!initial.id) set("slug", slugify(e.target.value)); }} /></label>
      <label className="label">URL slug<input className="input" value={d.slug ?? ""} onChange={(e) => set("slug", slugify(e.target.value))} /></label>
      <div className="grid grid-cols-4 gap-3">
        <label className="label">Bedrooms<input className="input" value={d.bedrooms ?? ""} onChange={(e) => set("bedrooms", e.target.value)} /></label>
        <label className="label">Bathrooms<input className="input" value={d.bathrooms ?? ""} onChange={(e) => set("bathrooms", e.target.value)} /></label>
        <label className="label">Sqft<input className="input" value={d.sqft ?? ""} onChange={(e) => set("sqft", e.target.value)} /></label>
        <label className="label">Starting price<input className="input" value={d.starting_price ?? ""} onChange={(e) => set("starting_price", e.target.value)} /></label>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <label className="label">Storeys<input className="input" value={d.storeys ?? ""} onChange={(e) => set("storeys", e.target.value)} /></label>
        <label className="label">Building type<input className="input" placeholder="Townhome, Row/Townhome…" value={d.building_type ?? ""} onChange={(e) => set("building_type", e.target.value)} /></label>
        <label className="label">Move-in ready
          <select className="input" value={d.move_in_ready === true ? "true" : d.move_in_ready === false ? "false" : ""} onChange={(e) => set("move_in_ready", e.target.value === "" ? null : e.target.value === "true")}>
            <option value="">—</option><option value="true">Yes</option><option value="false">No</option>
          </select>
        </label>
      </div>
      <label className="label">Model image URL<input className="input" value={d.model_image_url ?? ""} onChange={(e) => set("model_image_url", e.target.value)} /></label>
      <label className="label">Title (marketing title, may differ from name)<input className="input" value={d.title ?? ""} onChange={(e) => set("title", e.target.value)} /></label>
      <label className="label">Description<textarea className="textarea" rows={3} value={d.description ?? ""} onChange={(e) => set("description", e.target.value)} /></label>
      <p className="text-xs text-muted">Floor plans, payment plans, and gallery photos beyond the main image are managed directly in the pre-con database for now — ask if you'd like admin screens for those too.</p>
      <div className="flex gap-2"><button className="btn" onClick={onCancel}>Cancel</button><button className="btn-primary" onClick={() => onSave(d)} disabled={!d.model_name?.trim() || !d.slug?.trim() || !d.project_id}>Save</button></div>
    </div>
  );
}

export function ModelsManager({ initial, projects }: { initial: HomeModel[]; projects: Project[] }) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Partial<HomeModel> | null>(null);
  const [error, setError] = useState("");
  const projectName = (id: string | null) => projects.find((p) => p.id === id)?.project_name ?? "—";

  async function save(d: Partial<HomeModel>) {
    setError("");
    const res = await fetch(d.id ? `/api/admin/precon/models/${d.id}` : "/api/admin/precon/models", {
      method: d.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d),
    });
    const body = await res.json();
    if (!res.ok) return setError(body.error || "Something went wrong.");
    const saved = body.model as HomeModel;
    setRows(d.id ? rows.map((r) => (r.id === d.id ? saved : r)) : [...rows, saved]);
    setEditing(null);
  }
  async function remove(id: string) {
    if (!confirm("Delete this model?")) return;
    const res = await fetch(`/api/admin/precon/models/${id}`, { method: "DELETE" });
    if (!res.ok) return setError((await res.json()).error || "Could not delete.");
    setRows(rows.filter((r) => r.id !== id));
  }

  return (
    <div className="flex flex-col gap-5">
      <button className="btn-primary self-start" onClick={() => setEditing({})}>+ Add model</button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {editing ? <Form initial={editing} projects={projects} onCancel={() => setEditing(null)} onSave={save} /> : null}
      <div className="overflow-hidden rounded-2xl bg-white">
        <table className="w-full text-left">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted"><tr><th className="p-4">Model</th><th className="p-4">Project</th><th className="p-4"></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line/60 last:border-0">
                <td className="p-4 font-medium">{r.model_name}</td>
                <td className="p-4 text-muted">{projectName(r.project_id)}</td>
                <td className="p-4"><div className="flex gap-3 text-xs"><button className="font-medium text-primary" onClick={() => setEditing(r)}>Edit</button><button className="font-medium text-red-700" onClick={() => remove(r.id)}>Delete</button></div></td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={3} className="p-8 text-center text-muted">No models yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
