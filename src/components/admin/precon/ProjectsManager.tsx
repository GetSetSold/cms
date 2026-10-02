"use client";
import { Fragment, useState } from "react";
import type { Project, Builder } from "@/lib/precon";
import { PaymentPlansManager } from "./PaymentPlansManager";
import { GalleryManager } from "./GalleryManager";
import { ProjectAmenitiesManager } from "./ProjectAmenitiesManager";

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

type ModelCandidate = {
  model_name: string; bedrooms: string | null; bathrooms: string | null; sqft: string | null;
  starting_price: string | null; storeys: string | null; building_type: string | null;
  description: string | null; model_image_url: string | null; source_url: string;
};

const MODEL_COLS: { key: keyof ModelCandidate; label: string }[] = [
  { key: "model_name", label: "Model" },
  { key: "starting_price", label: "Price" },
  { key: "bedrooms", label: "Beds" },
  { key: "bathrooms", label: "Baths" },
  { key: "sqft", label: "Sqft" },
  { key: "storeys", label: "Storeys" },
  { key: "building_type", label: "Type" },
];

function ImportModal({ builders, onClose, onDone }: {
  builders: Builder[]; onClose: () => void; onDone: (project: Project) => void;
}) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [fetched, setFetched] = useState(false);
  const [draft, setDraft] = useState({ project_name: "", city: "", p_start_price: "", project_status: "", project_description: "", main_image_url: "" });
  const [builderId, setBuilderId] = useState("");
  const [notes, setNotes] = useState<string[]>([]);
  const [models, setModels] = useState<ModelCandidate[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [scanNotes, setScanNotes] = useState<string[]>([]);

  const setD = (k: string, v: string) => setDraft((d) => ({ ...d, [k]: v }));
  const toggle = (name: string) =>
    setSelected((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]));

  async function fetchProject() {
    setBusy(true); setError(""); setNotes([]); setModels([]); setSelected([]); setScanNotes([]);
    try {
      const res = await fetch("/api/admin/precon/import", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Import failed.");
      const d = body.draft;
      setDraft({
        project_name: d.project_name ?? "", city: d.city ?? "", p_start_price: d.p_start_price ?? "",
        project_status: d.project_status ?? "", project_description: d.project_description ?? "",
        main_image_url: d.main_image_url ?? "",
      });
      setNotes(body.meta?.notes ?? []);
      setFetched(true);
    } catch (e: any) { setError(e.message || "Import failed."); }
    setBusy(false);
  }

  async function scanModels() {
    setScanning(true); setError("");
    try {
      const res = await fetch("/api/admin/precon/import-models", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Scan failed.");
      const found: ModelCandidate[] = body.models ?? [];
      setModels(found);
      setSelected(found.map((m) => m.model_name));
      setScanNotes(body.meta?.notes ?? []);
    } catch (e: any) { setError(e.message || "Scan failed."); }
    setScanning(false);
  }

  async function doImport() {
    if (!builderId || !draft.project_name.trim()) return;
    setImporting(true); setError("");
    try {
      const clean: Record<string, any> = { builder_id: Number(builderId), slug: slugify(draft.project_name) };
      (["project_name", "city", "p_start_price", "project_status", "project_description", "main_image_url"] as const)
        .forEach((k) => { if (draft[k].trim()) clean[k] = draft[k].trim(); });
      const res = await fetch("/api/admin/precon/projects", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(clean),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not create project.");
      const project = body.project as Project;

      const chosen = models.filter((m) => selected.includes(m.model_name));
      for (const m of chosen) {
        const { source_url, ...rest } = m;
        const payload: Record<string, any> = { ...rest, project_id: project.id, slug: slugify(m.model_name) };
        Object.keys(payload).forEach((k) => { if (payload[k] == null || payload[k] === "") delete payload[k]; });
        await fetch("/api/admin/precon/models", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
      }
      onDone(project);
    } catch (e: any) { setError(e.message || "Import failed."); }
    setImporting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <strong className="text-base">Import project from URL</strong>
          <button type="button" className="ml-auto text-muted hover:text-ink" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="flex gap-2">
          <input className="input" placeholder="https://builder.com/communities/project-name" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") fetchProject(); }} />
          <button type="button" className="btn-primary shrink-0" onClick={fetchProject} disabled={busy || !url.trim()}>{busy ? "Fetching…" : "Fetch"}</button>
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        {fetched ? (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="label">Project name<input className="input" value={draft.project_name} onChange={(e) => setD("project_name", e.target.value)} /></label>
              <label className="label">Builder
                <select className="input" value={builderId} onChange={(e) => setBuilderId(e.target.value)}>
                  <option value="">Select…</option>
                  {builders.map((b) => <option key={b.id} value={b.id}>{b.builder_name}</option>)}
                </select>
              </label>
              <label className="label">City<input className="input" value={draft.city} onChange={(e) => setD("city", e.target.value)} /></label>
              <label className="label">Starting price<input className="input" value={draft.p_start_price} onChange={(e) => setD("p_start_price", e.target.value)} /></label>
              <label className="label">Status<input className="input" value={draft.project_status} onChange={(e) => setD("project_status", e.target.value)} /></label>
              <label className="label">Main image URL<input className="input" value={draft.main_image_url} onChange={(e) => setD("main_image_url", e.target.value)} /></label>
            </div>
            {notes.length ? <p className="text-xs text-muted">Found: {notes.join(" · ")}</p> : null}

            <div className="flex items-center gap-2 border-t border-line pt-3">
              <strong className="text-sm">Models</strong>
              {scanNotes.length ? <span className="text-xs text-muted">{scanNotes.join(" · ")}</span> : null}
              <button type="button" className="btn ml-auto h-8 px-3 text-xs" onClick={scanModels} disabled={scanning}>
                {scanning ? "Scanning…" : models.length ? "Re-scan" : "Scan for models"}
              </button>
            </div>

            {models.length ? (
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-line bg-ground text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="w-10 p-2.5"><input type="checkbox" checked={selected.length === models.length && models.length > 0} onChange={(e) => setSelected(e.target.checked ? models.map((m) => m.model_name) : [])} aria-label="Select all" /></th>
                      {MODEL_COLS.map((c) => <th key={c.key} className="p-2.5">{c.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {models.map((m) => (
                      <tr key={m.model_name} className="border-b border-line/60 last:border-0">
                        <td className="p-2.5"><input type="checkbox" checked={selected.includes(m.model_name)} onChange={() => toggle(m.model_name)} aria-label={m.model_name} /></td>
                        {MODEL_COLS.map((c) => (
                          <td key={c.key} className={`p-2.5 ${c.key === "model_name" ? "font-medium" : "text-muted"}`}>{m[c.key] ?? <span className="text-line">—</span>}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <div className="flex items-center gap-2 border-t border-line pt-3">
              <button type="button" className="btn-primary" onClick={doImport} disabled={importing || !builderId || !draft.project_name.trim()}>
                {importing ? "Importing…" : `Import project${selected.length ? ` + ${selected.length} model${selected.length === 1 ? "" : "s"}` : ""}`}
              </button>
              {!builderId ? <span className="text-xs text-muted">Pick a builder to enable import.</span> : null}
            </div>
          </>
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
      {importOpen ? <ImportModal builders={builders} onClose={() => setImportOpen(false)} onDone={(p) => { setImportOpen(false); setRows((r) => [p, ...r]); }} /> : null}
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
                        <ProjectAmenitiesManager projectId={r.id} />
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
