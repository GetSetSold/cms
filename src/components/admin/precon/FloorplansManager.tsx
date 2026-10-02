"use client";
import { useEffect, useState } from "react";
import type { Floorplan } from "@/lib/precon";

function Form({ initial, onSave, onCancel }: { initial: Partial<Floorplan>; onSave: (d: Partial<Floorplan>) => void; onCancel: () => void }) {
  const [d, setD] = useState<Partial<Floorplan>>(initial);
  const set = (k: keyof Floorplan, v: any) => setD((x) => ({ ...x, [k]: v }));
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-ground p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="label">Plan name<input className="input" value={d.floorplan_name ?? ""} onChange={(e) => set("floorplan_name", e.target.value)} /></label>
        <label className="label">Image URL<input className="input" value={d.floorplan_image_url ?? ""} onChange={(e) => set("floorplan_image_url", e.target.value)} /></label>
      </div>
      {d.floorplan_image_url ? <img src={d.floorplan_image_url} alt="" className="h-24 w-auto self-start rounded border border-line object-contain" /> : null}
      <div className="flex gap-2">
        <button type="button" className="btn h-8 px-3 text-xs" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn-primary h-8 px-3 text-xs" onClick={() => onSave(d)} disabled={!d.floorplan_name?.trim()}>Save</button>
      </div>
    </div>
  );
}

export function FloorplansManager({ modelId }: { modelId: string }) {
  const [rows, setRows] = useState<Floorplan[]>([]);
  const [editing, setEditing] = useState<Partial<Floorplan> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/precon/floorplans?model_id=${encodeURIComponent(modelId)}`);
        const b = await res.json();
        if (!res.ok) throw new Error(b.error || "Load failed.");
        setRows(b.floorplans ?? []);
      } catch (e: any) { setError(e.message || "Could not load floor plans."); }
      setLoading(false);
    })();
  }, [modelId]);

  async function save(d: Partial<Floorplan>) {
    setError("");
    const res = await fetch(d.id ? `/api/admin/precon/floorplans/${d.id}` : "/api/admin/precon/floorplans", {
      method: d.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...d, model_id: modelId }),
    });
    const body = await res.json();
    if (!res.ok) return setError(body.error || "Something went wrong.");
    const saved = body.floorplan as Floorplan;
    setRows(d.id ? rows.map((r) => (r.id === d.id ? saved : r)) : [...rows, saved]);
    setEditing(null);
  }

  async function remove(id: string) {
    if (!confirm("Delete this floor plan?")) return;
    const res = await fetch(`/api/admin/precon/floorplans/${id}`, { method: "DELETE" });
    if (!res.ok) return setError((await res.json()).error || "Could not delete.");
    setRows(rows.filter((r) => r.id !== id));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <strong className="text-sm">Floor plans</strong>
        <span className="rounded-full bg-ground px-2 py-0.5 text-xs text-muted">{loading ? "…" : rows.length}</span>
        <button type="button" className="btn ml-auto h-8 px-3 text-xs" onClick={() => setEditing({})}>+ Add plan</button>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {editing ? <Form initial={editing} onCancel={() => setEditing(null)} onSave={save} /> : null}
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-3 rounded-lg border border-line bg-white p-2">
          {r.floorplan_image_url
            ? <img src={r.floorplan_image_url} alt="" className="h-12 w-16 shrink-0 rounded object-cover" />
            : <div className="h-12 w-16 shrink-0 rounded bg-soft" />}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{r.floorplan_name || "(untitled)"}</div>
            <div className="truncate text-xs text-muted">{r.floorplan_image_url}</div>
          </div>
          <div className="flex shrink-0 gap-3 text-xs">
            <button type="button" className="font-medium text-primary" onClick={() => setEditing(r)}>Edit</button>
            <button type="button" className="font-medium text-red-700" onClick={() => remove(r.id)}>Delete</button>
          </div>
        </div>
      ))}
      {!loading && !rows.length && !editing ? <p className="text-xs text-muted">No floor plans yet.</p> : null}
    </div>
  );
}
