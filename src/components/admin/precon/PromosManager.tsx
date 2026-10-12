"use client";
import { useState } from "react";
import type { Promo } from "@/lib/precon";

function Form({ initial, builders, projects, onSave, onCancel }: {
  initial: Partial<Promo>;
  builders: { id: number; builder_name: string | null }[];
  projects: { id: string; project_name: string | null }[];
  onSave: (d: Partial<Promo>) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState<Partial<Promo>>(initial);
  const set = (k: keyof Promo, v: any) => setD((x) => ({ ...x, [k]: v }));
  return (
    <div className="card flex max-w-3xl flex-col gap-3">
      <strong className="text-base">{initial.id ? "Edit promo" : "Add promo"}</strong>
      <label className="label">Title<input className="input" value={d.title ?? ""} onChange={(e) => set("title", e.target.value)} /></label>
      <label className="label">Description<textarea className="textarea" rows={2} value={d.description ?? ""} onChange={(e) => set("description", e.target.value)} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="label">Badge<input className="input" placeholder="CASHBACK" value={d.badge ?? ""} onChange={(e) => set("badge", e.target.value)} /></label>
        <label className="label">Type
          <select className="input" value={d.promo_type ?? "limited_time"} onChange={(e) => set("promo_type", e.target.value)}>
            <option value="limited_time">Limited time</option>
            <option value="builder">Builder</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="label">Start date<input type="date" className="input" value={d.start_date ?? ""} onChange={(e) => set("start_date", e.target.value || null)} /></label>
        <label className="label">End date<input type="date" className="input" value={d.end_date ?? ""} onChange={(e) => set("end_date", e.target.value || null)} /></label>
      </div>
      <label className="label">Bullets (one per line)<textarea className="textarea" rows={3} value={(d.bullets ?? []).join("\n")} onChange={(e) => set("bullets", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="label">Builder
          <select className="input" value={d.builder_id ?? ""} onChange={(e) => set("builder_id", e.target.value ? Number(e.target.value) : null)}>
            <option value="">— None —</option>
            {builders.map((b) => <option key={b.id} value={b.id}>{b.builder_name}</option>)}
          </select>
        </label>
        <label className="label">Project (optional)
          <select className="input" value={d.project_id ?? ""} onChange={(e) => set("project_id", e.target.value || null)}>
            <option value="">— Builder-wide —</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.project_name}</option>)}
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.show ?? true} onChange={(e) => set("show", e.target.checked)} /> Show on site</label>
      <div className="flex gap-2">
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn-primary" onClick={() => onSave(d)} disabled={!d.title?.trim()}>Save</button>
      </div>
    </div>
  );
}

export function PromosManager({ initial, builders, projects }: {
  initial: Promo[];
  builders: { id: number; builder_name: string | null }[];
  projects: { id: string; project_name: string | null }[];
}) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Partial<Promo> | null>(null);
  const [error, setError] = useState("");

  async function save(d: Partial<Promo>) {
    setError("");
    const res = await fetch(d.id ? `/api/admin/precon/promos/${d.id}` : "/api/admin/precon/promos", {
      method: d.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d),
    });
    const body = await res.json();
    if (!res.ok) return setError(body.error || "Something went wrong.");
    const saved = body.promo as Promo;
    setRows(d.id ? rows.map((r) => (r.id === d.id ? saved : r)) : [saved, ...rows]);
    setEditing(null);
  }

  async function remove(id: string) {
    if (!confirm("Delete this promo?")) return;
    const res = await fetch(`/api/admin/precon/promos/${id}`, { method: "DELETE" });
    if (!res.ok) return setError((await res.json()).error || "Could not delete.");
    setRows(rows.filter((r) => r.id !== id));
  }

  return (
    <div className="flex flex-col gap-5">
      <button className="btn-primary self-start" onClick={() => setEditing({ promo_type: "limited_time", show: true })}>+ Add promo</button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {editing ? <Form initial={editing} builders={builders} projects={projects} onCancel={() => setEditing(null)} onSave={save} /> : null}
      <div className="overflow-hidden rounded-2xl bg-white">
        <table className="w-full text-left">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted"><tr><th className="p-4">Promo</th><th className="p-4">Type</th><th className="p-4">Dates</th><th className="p-4"></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line/60 last:border-0">
                <td className="p-4">
                  <div className="font-medium">{r.title}</div>
                  {r.badge ? <span className="mt-1 inline-block rounded bg-soft px-2 py-0.5 text-[11px] font-bold">{r.badge}</span> : null}
                </td>
                <td className="p-4 text-sm text-muted">{r.promo_type}</td>
                <td className="p-4 text-sm text-muted">{r.start_date ?? "—"} → {r.end_date ?? "—"}</td>
                <td className="p-4"><div className="flex gap-3 text-xs"><button className="font-medium text-primary" onClick={() => setEditing(r)}>Edit</button><button className="font-medium text-red-700" onClick={() => remove(r.id)}>Delete</button></div></td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={4} className="p-8 text-center text-muted">No promos yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
