"use client";
import { Fragment, useState } from "react";
import type { Project, Builder } from "@/lib/precon";
import { PaymentPlansManager } from "./PaymentPlansManager";
import { GalleryManager } from "./GalleryManager";

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

function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: (d: Partial<Project>) => void }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<string[]>([]);

  async function run() {
    setBusy(true); setError(""); setNotes([]);
    try {
      const res = await fetch("/api/admin/precon/import", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Import failed.");
      setNotes(body.meta?.notes ?? []);
      const draft = body.draft as Partial<Project>;
      onImported({ ...draft, slug: slugify(draft.project_name ?? "") });
    } catch (e: any) { setError(e.message || "Import failed."); }
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex w-full max-w-lg flex-col gap-3 rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <strong className="text-base">Import project from URL</strong>
          <button type="button" className="ml-auto text-muted hover:text-ink" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="text-xs text-muted">Paste a builder project page. We&apos;ll pull the name, price, status, description and main image into a draft — you review and pick the builder before saving.</p>
        <div className="flex gap-2">
          <input className="input" placeholder="https://builder.com/communities/project-name" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") run(); }} />
          <button type="button" className="btn-primary shrink-0" onClick={run} disabled={busy || !url.trim()}>{busy ? "Fetching…" : "Fetch"}</button>
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {notes.length ? (
          <div className="rounded-lg bg-ground p-2.5 text-xs text-muted">
            <div className="mb-1 font-semibold text-ink">Found:</div>
            <ul className="list-disc pl-4">{notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ProjectsManager({ initial, builders }: { initial: Project[]; builders: Builder[] }) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Partial<Project> | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
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
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={() => setEditing({})}>+ Add project</button>
        <button className="btn" onClick={() => setImportOpen(true)}>Import from URL</button>
      </div>
      {importOpen ? <ImportModal onClose={() => setImportOpen(false)} onImported={(d) => { setImportOpen(false); setEditing(d); }} /> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {editing ? <Form initial={editing} builders={builders} onCancel={() => setEditing(null)} onSave={save} /> : null}
      <div className="overflow-hidden rounded-2xl bg-white">
        <table className="w-full text-left">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted"><tr><th className="w-10 p-4"></th><th className="p-4">Project</th><th className="p-4">Builder</th><th className="p-4">City</th><th className="p-4">Status</th><th className="p-4"></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <Fragment key={r.id}>
                <tr className="border-b border-line/60">
                  <td className="p-4">
                    <button type="button" aria-label="Toggle details" onClick={() => setExpanded(expanded === r.id ? null : r.id)} className="flex h-6 w-6 items-center justify-center text-muted hover:text-ink">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={`transition-transform ${expanded === r.id ? "rotate-90" : ""}`}><path d="m9 6 6 6-6 6" /></svg>
                    </button>
                  </td>
                  <td className="p-4 font-medium">{r.project_name}</td>
                  <td className="p-4 text-muted">{builderName(r.builder_id)}</td>
                  <td className="p-4 text-muted">{r.city}</td>
                  <td className="p-4 text-muted">{r.project_status}</td>
                  <td className="p-4"><div className="flex gap-3 text-xs"><button className="font-medium text-primary" onClick={() => setEditing(r)}>Edit</button><button className="font-medium text-red-700" onClick={() => remove(r.id)}>Delete</button></div></td>
                </tr>
                {expanded === r.id ? (
                  <tr className="border-b border-line/60 bg-ground/50">
                    <td colSpan={6} className="p-4">
                      <div className="flex flex-col gap-5">
                        <PaymentPlansManager projectId={r.id} />
                        <GalleryManager relatedType="project" relatedId={r.id} />
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
            {!rows.length ? <tr><td colSpan={6} className="p-8 text-center text-muted">No projects yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
