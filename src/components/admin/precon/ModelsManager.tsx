"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Model = {
  id: string; project_id: string; slug: string; name: string; status: string; price_from: number | null;
  bedrooms: number | null; bathrooms: number | null; sqft: number | null; storeys: number | null;
  building_type: string | null; move_in_date: string | null; cashback_amount: number | null;
  gallery: string[]; floor_plans: string[]; payment_plan: { milestone: string; percent: number }[]; amenities: string[];
};
type Project = { id: string; name: string };

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const numOrNull = (v: string) => (v === "" ? null : Number(v));
const linesToArr = (v: string) => v.split("\n").map((s) => s.trim()).filter(Boolean);

function Form({ initial, projects, onSave, onCancel }: { initial: Partial<Model>; projects: Project[]; onSave: (d: Partial<Model>) => void; onCancel: () => void }) {
  const [d, setD] = useState<Partial<Model>>(initial);
  const set = (k: keyof Model, v: any) => setD((x) => ({ ...x, [k]: v }));
  const plan = d.payment_plan ?? [];
  const setPlan = (p: typeof plan) => set("payment_plan", p);

  return (
    <div className="card flex max-w-3xl flex-col gap-3">
      <strong className="text-base">{initial.id ? "Edit model" : "Add model"}</strong>
      <div className="grid grid-cols-2 gap-3">
        <label className="label">Project
          <select className="input" value={d.project_id ?? ""} onChange={(e) => set("project_id", e.target.value)}>
            <option value="">Select…</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="label">Status
          <select className="input" value={d.status ?? "Pre-Construction"} onChange={(e) => set("status", e.target.value)}>
            <option>Pre-Construction</option><option>Move-In Ready</option>
          </select>
        </label>
      </div>
      <label className="label">Model name<input className="input" value={d.name ?? ""} onChange={(e) => { set("name", e.target.value); if (!initial.id) set("slug", slugify(e.target.value)); }} /></label>
      <label className="label">URL slug<input className="input" value={d.slug ?? ""} onChange={(e) => set("slug", slugify(e.target.value))} /></label>
      <div className="grid grid-cols-4 gap-3">
        <label className="label">Price from<input className="input" type="number" value={d.price_from ?? ""} onChange={(e) => set("price_from", numOrNull(e.target.value))} /></label>
        <label className="label">Bedrooms<input className="input" type="number" value={d.bedrooms ?? ""} onChange={(e) => set("bedrooms", numOrNull(e.target.value))} /></label>
        <label className="label">Bathrooms<input className="input" type="number" value={d.bathrooms ?? ""} onChange={(e) => set("bathrooms", numOrNull(e.target.value))} /></label>
        <label className="label">Sqft<input className="input" type="number" value={d.sqft ?? ""} onChange={(e) => set("sqft", numOrNull(e.target.value))} /></label>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <label className="label">Storeys<input className="input" type="number" value={d.storeys ?? ""} onChange={(e) => set("storeys", numOrNull(e.target.value))} /></label>
        <label className="label">Building type<input className="input" placeholder="Condo / Townhome / Detached" value={d.building_type ?? ""} onChange={(e) => set("building_type", e.target.value)} /></label>
        <label className="label">Move-in date<input className="input" placeholder="TBA, Fall 2027…" value={d.move_in_date ?? ""} onChange={(e) => set("move_in_date", e.target.value)} /></label>
        <label className="label">Cashback ($)<input className="input" type="number" value={d.cashback_amount ?? ""} onChange={(e) => set("cashback_amount", numOrNull(e.target.value))} /></label>
      </div>
      <label className="label">Gallery photo URLs (one per line)<textarea className="textarea font-mono text-xs" rows={3} value={(d.gallery ?? []).join("\n")} onChange={(e) => set("gallery", linesToArr(e.target.value))} /></label>
      <label className="label">Floor plan image URLs (one per line)<textarea className="textarea font-mono text-xs" rows={3} value={(d.floor_plans ?? []).join("\n")} onChange={(e) => set("floor_plans", linesToArr(e.target.value))} /></label>
      <label className="label">Amenities (one per line)<textarea className="textarea" rows={3} value={(d.amenities ?? []).join("\n")} onChange={(e) => set("amenities", linesToArr(e.target.value))} /></label>

      <div className="flex flex-col gap-2 rounded-lg bg-ground p-3">
        <span className="text-sm font-medium">Payment plan</span>
        {plan.map((step, i) => (
          <div key={i} className="flex gap-2">
            <input className="input" placeholder="Milestone (e.g. At signing)" value={step.milestone} onChange={(e) => setPlan(plan.map((s, j) => (j === i ? { ...s, milestone: e.target.value } : s)))} />
            <input className="input w-28" type="number" placeholder="%" value={step.percent} onChange={(e) => setPlan(plan.map((s, j) => (j === i ? { ...s, percent: Number(e.target.value) } : s)))} />
            <button className="text-red-700" onClick={() => setPlan(plan.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <button className="btn self-start" onClick={() => setPlan([...plan, { milestone: "", percent: 0 }])}>+ Add step</button>
      </div>

      <div className="flex gap-2"><button className="btn" onClick={onCancel}>Cancel</button><button className="btn-primary" onClick={() => onSave(d)} disabled={!d.name?.trim() || !d.slug?.trim() || !d.project_id}>Save</button></div>
    </div>
  );
}

export function ModelsManager({ initial, projects }: { initial: (Model & { project: Project })[]; projects: Project[] }) {
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Partial<Model> | null>(null);
  const [error, setError] = useState("");

  async function save(d: Partial<Model>) {
    setError("");
    if (d.id) {
      const { data, error } = await supabase.from("precon_models").update(d).eq("id", d.id).select("*, project:precon_projects(id,name)").single();
      if (error) return setError(error.message);
      setRows(rows.map((r) => (r.id === d.id ? (data as any) : r)));
    } else {
      const { data, error } = await supabase.from("precon_models").insert(d).select("*, project:precon_projects(id,name)").single();
      if (error) return setError(error.message);
      setRows([...rows, data as any]);
    }
    setEditing(null);
  }
  async function remove(id: string) {
    if (!confirm("Delete this model?")) return;
    await supabase.from("precon_models").delete().eq("id", id);
    setRows(rows.filter((r) => r.id !== id));
  }

  return (
    <div className="flex flex-col gap-5">
      <button className="btn-primary self-start" onClick={() => setEditing({ status: "Pre-Construction", gallery: [], floor_plans: [], amenities: [], payment_plan: [] })}>+ Add model</button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {editing ? <Form initial={editing} projects={projects} onCancel={() => setEditing(null)} onSave={save} /> : null}
      <div className="overflow-hidden rounded-2xl bg-white">
        <table className="w-full text-left">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted"><tr><th className="p-4">Model</th><th className="p-4">Project</th><th className="p-4">Status</th><th className="p-4"></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line/60 last:border-0">
                <td className="p-4 font-medium">{r.name}</td>
                <td className="p-4 text-muted">{r.project?.name}</td>
                <td className="p-4 text-muted">{r.status}</td>
                <td className="p-4"><div className="flex gap-3 text-xs"><button className="font-medium text-primary" onClick={() => setEditing(r)}>Edit</button><button className="font-medium text-red-700" onClick={() => remove(r.id)}>Delete</button></div></td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={4} className="p-8 text-center text-muted">No models yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
