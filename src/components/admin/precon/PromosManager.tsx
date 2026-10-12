"use client";
import { useState } from "react";
import type { Promo } from "@/lib/precon";
import { PromoItemsManager } from "./PromoItemsManager";

type Builder = { id: number; builder_name: string | null };
type Project = { id: string; project_name: string | null; builder_id: number | null };

function Form({ initial, builders, projects, onSave, onCancel }: {
  initial: Partial<Promo>;
  builders: Builder[];
  projects: Project[];
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
      <label className="label">Bullets (one per line)<textarea className="textarea" rows={3} value={(Array.isArray(d.bullets) ? d.bullets : []).join("\n")} onChange={(e) => set("bullets", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="label">Display Page
          <select className="input" value={d.display_page ?? ""} onChange={(e) => set("display_page", e.target.value || null)}>
            <option value="">— All pages —</option>
            <option value="builder">Builder page</option>
            <option value="project">Project page</option>
            <option value="model">Model page</option>
            <option value="builder,project">Builder + Project</option>
            <option value="project,model">Project + Model</option>
            <option value="builder,project,model">Builder + Project + Model</option>
          </select>
        </label>
        <label className="label">Builder
          <select className="input" value={d.builder_id ?? ""} onChange={(e) => set("builder_id", e.target.value ? Number(e.target.value) : null)}>
            <option value="">— None —</option>
            {builders.map((b) => <option key={b.id} value={b.id}>{b.builder_name}</option>)}
          </select>
        </label>
        <label className="label">Project (optional — leave empty for builder-wide)
          <select className="input" value={d.project_id ?? ""} onChange={(e) => set("project_id", e.target.value || null)}>
            <option value="">— Builder-wide —</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.project_name}</option>)}
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.show ?? true} onChange={(e) => set("show", e.target.checked)} /> Show on site</label>
      {initial.id ? <PromoItemsManager promoId={initial.id} /> : <p className="text-xs text-muted">Save this promo first, then add sub-items.</p>}
      <div className="flex gap-2">
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn-primary" onClick={() => onSave(d)} disabled={!d.title?.trim()}>Save</button>
      </div>
    </div>
  );
}

export function PromosManager({ initial, builders, projects }: {
  initial: Promo[];
  builders: Builder[];
  projects: Project[];
}) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Partial<Promo> | null>(null);
  const [error, setError] = useState("");
  const [filterBuilder, setFilterBuilder] = useState<string>("");

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

  // Group by builder like the old tool
  const filtered = filterBuilder ? rows.filter((r) => String(r.builder_id) === filterBuilder) : rows;
  const groups = new Map<string, Promo[]>();
  filtered.forEach((r) => {
    const key = r.builder_id != null ? String(r.builder_id) : "none";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  });
  const builderName = (id: string) => id === "none" ? "No builder" : builders.find((b) => String(b.id) === id)?.builder_name ?? `Builder ${id}`;
  const projectName = (id: string | null) => !id ? null : projects.find((p) => p.id === id)?.project_name ?? id.slice(0, 8);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" onClick={() => setEditing({ promo_type: "limited_time", show: true })}>+ Add promo</button>
        <select className="input max-w-xs" value={filterBuilder} onChange={(e) => setFilterBuilder(e.target.value)}>
          <option value="">All builders ({rows.length} promos)</option>
          {builders.map((b) => (
            <option key={b.id} value={String(b.id)}>{b.builder_name} ({rows.filter((r) => r.builder_id === b.id).length})</option>
          ))}
        </select>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {editing ? <Form initial={editing} builders={builders} projects={projects} onCancel={() => setEditing(null)} onSave={save} /> : null}

      {[...groups.entries()].map(([bid, promos]) => (
        <div key={bid} className="overflow-hidden rounded-2xl bg-white">
          <div className="border-b border-line bg-ground/50 px-4 py-3">
            <span className="text-sm font-bold">Promos for {builderName(bid)}</span>
            <span className="ml-2 text-xs text-muted">{promos.length} promos</span>
          </div>
          <table className="w-full text-left">
            <tbody>
              {promos.map((r) => {
                const pname = projectName(r.project_id);
                return (
                  <tr key={r.id} className="border-b border-line/60 last:border-0">
                    <td className="p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{r.title}</span>
                        {r.badge ? <span className="rounded bg-soft px-2 py-0.5 text-[11px] font-bold uppercase">{r.badge}</span> : null}
                        <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${r.promo_type === "limited_time" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>
                          {r.promo_type === "limited_time" ? "⏱ Limited Time" : "🏢 Builder"}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                        {pname ? <span className="rounded bg-green-50 px-2 py-0.5 font-medium text-green-700">📌 {pname}</span> : <span className="rounded bg-soft px-2 py-0.5">Builder-wide</span>}
                        <span>{r.start_date ?? "—"} → {r.end_date ?? "—"}</span>
                        {r.description ? <span className="max-w-md truncate">· {r.description}</span> : null}
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap"><div className="flex gap-3 text-xs"><button className="font-medium text-primary" onClick={() => setEditing(r)}>Edit</button><button className="font-medium text-red-700" onClick={() => remove(r.id)}>Delete</button></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
      {!filtered.length ? <p className="rounded-2xl bg-white p-8 text-center text-sm text-muted">No promos yet. Click "+ Add promo" to create one.</p> : null}
    </div>
  );
}
