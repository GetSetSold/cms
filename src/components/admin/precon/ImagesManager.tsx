"use client";
import { useEffect, useState } from "react";
import { LibraryPicker } from "./LibraryPicker";

type Img = { id: string; image_url: string | null; alt_text: string | null; sort_order: number | null };
type Assignment = { id: string; image_id: string | null; related_type: string; related_id: string };
type Named = { id: string; name: string; kind: string };

function AssignModal({ image, onClose, onSave }: {
  image: Img;
  onClose: () => void;
  onSave: (assignments: { related_type: string; related_id: string }[]) => void;
}) {
  const [places, setPlaces] = useState<Named[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/precon/builders").then((r) => r.json()).catch(() => ({ builders: [] })),
      fetch("/api/admin/precon/projects").then((r) => r.json()).catch(() => ({ projects: [] })),
      fetch("/api/admin/precon/models").then((r) => r.json()).catch(() => ({ models: [] })),
      fetch(`/api/admin/precon/image-assignments?image_id=${image.id}`).then((r) => r.json()).catch(() => ({})),
    ]).then(([b, p, m, a]) => {
      const all: Named[] = [
        ...((b.builders ?? []).map((x: any) => ({ id: String(x.id), name: x.builder_name ?? x.id, kind: "Builder" }))),
        ...((p.projects ?? []).map((x: any) => ({ id: x.id, name: x.project_name ?? x.id, kind: "Project" }))),
        ...((m.models ?? []).map((x: any) => ({ id: x.id, name: x.model_name ?? x.id, kind: "Model" }))),
      ];
      setPlaces(all);
      const existing = a.assignments ?? a.image_assignments ?? [];
      setSelected(new Set(existing.map((x: Assignment) => `${x.related_type}:${x.related_id}`)));
    });
  }, [image.id]);

  function toggle(key: string) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  }

  async function handleSave() {
    setSaving(true);
    const list = [...selected].map((k) => {
      const [related_type, related_id] = k.split(/:(.*)/);
      return { related_type, related_id };
    });
    await onSave(list);
    setSaving(false);
  }

  const kindToType: Record<string, string> = { Builder: "builder", Project: "project", Model: "home_model" };
  const selectedPlaces = places.filter((pl) => selected.has(`${kindToType[pl.kind]}:${pl.id}`));
  const available = places.filter((pl) => !selected.has(`${kindToType[pl.kind]}:${pl.id}`));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-ground p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 text-base font-bold">Assign image</div>
        <p className="mb-4 text-sm text-muted">Choose where this image appears.</p>
        {image.image_url ? <img src={image.image_url} alt="" className="mb-4 h-24 w-auto rounded-lg object-cover" /> : null}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">Assigned to ({selectedPlaces.length})</span>
          <button type="button" className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-white" onClick={() => setPicking(true)}>+ Add</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedPlaces.map((pl) => (
            <span key={`${pl.kind}:${pl.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium">
              <span className="text-muted">{pl.kind}</span> {pl.name}
              <button type="button" onClick={() => toggle(`${kindToType[pl.kind]}:${pl.id}`)} className="ml-1 text-muted hover:text-red-700" aria-label="Remove">×</button>
            </span>
          ))}
          {!selectedPlaces.length ? <span className="text-xs text-muted">Not assigned anywhere yet.</span> : null}
        </div>
        <div className="mt-6 flex gap-2">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Assignments"}
          </button>
        </div>
        {picking ? (
          <LibraryPicker
            title="Assign image to…"
            items={available}
            getSearchText={(pl) => `${pl.name} ${pl.kind}`}
            renderItem={(pl) => (
              <>
                <span className="rounded bg-soft px-2 py-0.5 text-[11px] font-bold uppercase text-muted">{pl.kind}</span>
                <span className="text-sm">{pl.name}</span>
              </>
            )}
            onPick={(pl) => toggle(`${kindToType[pl.kind]}:${pl.id}`)}
            onClose={() => setPicking(false)}
          />
        ) : null}
      </div>
    </div>
  );
}

export function ImagesManager() {
  const [images, setImages] = useState<Img[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [nameMap, setNameMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Img | null>(null);
  const [assigning, setAssigning] = useState<Img | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/precon/images").then((r) => r.json()),
      fetch("/api/admin/precon/image-assignments").then((r) => r.json()).catch(() => ({})),
      fetch("/api/admin/precon/builders").then((r) => r.json()).catch(() => ({})),
      fetch("/api/admin/precon/projects").then((r) => r.json()).catch(() => ({})),
      fetch("/api/admin/precon/models").then((r) => r.json()).catch(() => ({})),
    ]).then(([imgData, assignData, bData, pData, mData]) => {
      setImages(imgData.images ?? []);
      setAssignments(assignData.assignments ?? assignData.image_assignments ?? []);
      const map = new Map<string, string>();
      (bData.builders ?? []).forEach((b: any) => map.set(`builder:${b.id}`, b.builder_name ?? "Builder"));
      (pData.projects ?? []).forEach((p: any) => map.set(`project:${p.id}`, p.project_name ?? "Project"));
      (mData.models ?? []).forEach((m: any) => map.set(`home_model:${m.id}`, m.model_name ?? "Model"));
      setNameMap(map);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function saveEdit(img: Img) {
    setError("");
    const res = await fetch(`/api/admin/precon/images/${img.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alt_text: img.alt_text, sort_order: img.sort_order }),
    });
    if (!res.ok) return setError("Could not save.");
    setImages(images.map((i) => (i.id === img.id ? img : i)));
    setEditing(null);
  }

  async function remove(id: string) {
    if (!confirm("Delete this image?")) return;
    const res = await fetch(`/api/admin/precon/images/${id}`, { method: "DELETE" });
    if (!res.ok) return setError("Could not delete.");
    setImages(images.filter((i) => i.id !== id));
  }

  async function saveAssignments(list: { related_type: string; related_id: string }[]) {
    if (!assigning) return;
    // Delete existing, then insert new
    await fetch(`/api/admin/precon/image-assignments?image_id=${assigning.id}`, { method: "DELETE" });
    for (const a of list) {
      await fetch("/api/admin/precon/image-assignments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_id: assigning.id, related_type: a.related_type, related_id: a.related_id }),
      });
    }
    // Refresh assignments
    const data = await fetch("/api/admin/precon/image-assignments").then((r) => r.json()).catch(() => ({}));
    setAssignments(data.assignments ?? data.image_assignments ?? []);
    setAssigning(null);
  }

  function usedNames(imageId: string): string[] {
    return assignments
      .filter((a) => a.image_id === imageId)
      .map((a) => nameMap.get(`${a.related_type}:${a.related_id}`) ?? `${a.related_type}`);
  }

  if (loading) return <p className="text-sm text-muted">Loading images…</p>;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{images.length} images in the pool. Click Assign to choose where each image appears.</p>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {editing ? (
        <div className="card flex max-w-2xl flex-col gap-3">
          <strong className="text-base">Edit image</strong>
          {editing.image_url ? <img src={editing.image_url} alt="" className="h-32 w-auto rounded object-contain" /> : null}
          <label className="label">Alt text<input className="input" value={editing.alt_text ?? ""} onChange={(e) => setEditing({ ...editing, alt_text: e.target.value })} /></label>
          <label className="label">Sort order<input type="number" className="input" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></label>
          <div className="flex gap-2">
            <button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button>
            <button type="button" className="btn-primary" onClick={() => saveEdit(editing)}>Save</button>
          </div>
        </div>
      ) : null}
      {assigning ? <AssignModal image={assigning} onClose={() => setAssigning(null)} onSave={saveAssignments} /> : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {images.map((img) => {
          const uses = usedNames(img.id);
          return (
            <div key={img.id} className="flex gap-3 rounded-2xl bg-white p-3">
              {img.image_url ? <img src={img.image_url} alt={img.alt_text ?? ""} className="h-20 w-28 shrink-0 rounded-lg object-cover" /> : null}
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="truncate text-sm font-medium">{img.alt_text || "Untitled"}</div>
                <div className="mt-1 line-clamp-2 text-xs text-muted">
                  {uses.length ? <>Used in: {uses.join(", ")}</> : "Not assigned"}
                </div>
                <div className="mt-auto flex gap-3 pt-2 text-xs">
                  <button className="font-medium text-primary" onClick={() => setEditing(img)}>Edit</button>
                  <button className="font-medium text-primary" onClick={() => setAssigning(img)}>Assign</button>
                  <button className="font-medium text-red-700" onClick={() => remove(img.id)}>Delete</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {!images.length ? <p className="text-sm text-muted">No images yet.</p> : null}
    </div>
  );
}
