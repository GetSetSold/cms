"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Project = {
  id: string; builder_id: string; slug: string; name: string; city: string | null; address: string | null;
  latitude: number | null; longitude: number | null; status: string; price_from: number | null;
  beds_min: number | null; beds_max: number | null; baths_min: number | null; baths_max: number | null;
  sqft_min: number | null; sqft_max: number | null; vip_release_date: string | null; cashback_amount: number | null;
  description: string | null; gallery: string[]; amenities: string[];
};
type Builder = { id: string; name: string };

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const numOrNull = (v: string) => (v === "" ? null : Number(v));
const linesToArr = (v: string) => v.split("\n").map((s) => s.trim()).filter(Boolean);

function Form({ initial, builders, onSave, onCancel }: { initial: Partial<Project>; builders: Builder[]; onSave: (d: Partial<Project>) => void; onCancel: () => void }) {
  const [d, setD] = useState<Partial<Project>>(initial);
  const set = (k: keyof Project, v: any) => setD((x) => ({ ...x, [k]: v }));
  return (
    <div className="card flex max-w-3xl flex-col gap-3">
      <strong className="text-base">{initial.id ? "Edit project" : "Add project"}</strong>
      <div className="grid grid-cols-2 gap-3">
        <label className="label">Builder
          <select className="input" value={d.builder_id ?? ""} onChange={(e) => set("builder_id", e.target.value)}>
            <option value="">Select…</option>
            {builders.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label className="label">Status
          <select className="input" value={d.status ?? "Coming Soon"} onChange={(e) => set("status", e.target.value)}>
            <option>Selling Now</option><option>Coming Soon</option><option>Sold Out</option>
          </select>
        </label>
      </div>
      <label className="label">Project name<input className="input" value={d.name ?? ""} onChange={(e) => { set("name", e.target.value); if (!initial.id) set("slug", slugify(e.target.value)); }} /></label>
      <label className="label">URL slug<input className="input" value={d.slug ?? ""} onChange={(e) => set("slug", slugify(e.target.value))} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="label">City<input className="input" value={d.city ?? ""} onChange={(e) => set("city", e.target.value)} /></label>
        <label className="label">Address<input className="input" value={d.address ?? ""} onChange={(e) => set("address", e.target.value)} /></label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="label">Latitude<input className="input" type="number" step="any" value={d.latitude ?? ""} onChange={(e) => set("latitude", numOrNull(e.target.value))} /></label>
        <label className="label">Longitude<input className="input" type="number" step="any" value={d.longitude ?? ""} onChange={(e) => set("longitude", numOrNull(e.target.value))} /></label>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <label className="label">Price from<input className="input" type="number" value={d.price_from ?? ""} onChange={(e) => set("price_from", numOrNull(e.target.value))} /></label>
        <label className="label">VIP release date<input className="input" type="date" value={d.vip_release_date ?? ""} onChange={(e) => set("vip_release_date", e.target.value || null)} /></label>
        <label className="label">Cashback ($)<input className="input" type="number" value={d.cashback_amount ?? ""} onChange={(e) => set("cashback_amount", numOrNull(e.target.value))} /></label>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <label className="label">Beds min<input className="input" type="number" value={d.beds_min ?? ""} onChange={(e) => set("beds_min", numOrNull(e.target.value))} /></label>
        <label className="label">Beds max<input className="input" type="number" value={d.beds_max ?? ""} onChange={(e) => set("beds_max", numOrNull(e.target.value))} /></label>
        <span />
        <label className="label">Baths min<input className="input" type="number" value={d.baths_min ?? ""} onChange={(e) => set("baths_min", numOrNull(e.target.value))} /></label>
        <label className="label">Baths max<input className="input" type="number" value={d.baths_max ?? ""} onChange={(e) => set("baths_max", numOrNull(e.target.value))} /></label>
        <span />
        <label className="label">Sqft min<input className="input" type="number" value={d.sqft_min ?? ""} onChange={(e) => set("sqft_min", numOrNull(e.target.value))} /></label>
        <label className="label">Sqft max<input className="input" type="number" value={d.sqft_max ?? ""} onChange={(e) => set("sqft_max", numOrNull(e.target.value))} /></label>
      </div>
      <label className="label">Description<textarea className="textarea" rows={3} value={d.description ?? ""} onChange={(e) => set("description", e.target.value)} /></label>
      <label className="label">Gallery photo URLs (one per line)<textarea className="textarea font-mono text-xs" rows={4} value={(d.gallery ?? []).join("\n")} onChange={(e) => set("gallery", linesToArr(e.target.value))} /></label>
      <label className="label">Amenities (one per line)<textarea className="textarea" rows={3} value={(d.amenities ?? []).join("\n")} onChange={(e) => set("amenities", linesToArr(e.target.value))} /></label>
      <div className="flex gap-2"><button className="btn" onClick={onCancel}>Cancel</button><button className="btn-primary" onClick={() => onSave(d)} disabled={!d.name?.trim() || !d.slug?.trim() || !d.builder_id}>Save</button></div>
    </div>
  );
}

export function ProjectsManager({ initial, builders }: { initial: (Project & { builder: Builder })[]; builders: Builder[] }) {
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Partial<Project> | null>(null);
  const [error, setError] = useState("");

  async function save(d: Partial<Project>) {
    setError("");
    if (d.id) {
      const { data, error } = await supabase.from("precon_projects").update(d).eq("id", d.id).select("*, builder:precon_builders(id,name)").single();
      if (error) return setError(error.message);
      setRows(rows.map((r) => (r.id === d.id ? (data as any) : r)));
    } else {
      const { data, error } = await supabase.from("precon_projects").insert(d).select("*, builder:precon_builders(id,name)").single();
      if (error) return setError(error.message);
      setRows([...rows, data as any]);
    }
    setEditing(null);
  }
  async function remove(id: string) {
    if (!confirm("Delete this project? Its models will also be removed.")) return;
    await supabase.from("precon_projects").delete().eq("id", id);
    setRows(rows.filter((r) => r.id !== id));
  }

  return (
    <div className="flex flex-col gap-5">
      <button className="btn-primary self-start" onClick={() => setEditing({ status: "Coming Soon", gallery: [], amenities: [] })}>+ Add project</button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {editing ? <Form initial={editing} builders={builders} onCancel={() => setEditing(null)} onSave={save} /> : null}
      <div className="overflow-hidden rounded-2xl bg-white">
        <table className="w-full text-left">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted"><tr><th className="p-4">Project</th><th className="p-4">Builder</th><th className="p-4">City</th><th className="p-4">Status</th><th className="p-4"></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line/60 last:border-0">
                <td className="p-4 font-medium">{r.name}</td>
                <td className="p-4 text-muted">{r.builder?.name}</td>
                <td className="p-4 text-muted">{r.city}</td>
                <td className="p-4 text-muted">{r.status}</td>
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
