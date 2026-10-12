"use client";
import { useEffect, useState } from "react";

type Img = { id: string; image_url: string | null; alt_text: string | null; sort_order: number | null };
type Assignment = { id: string; image_id: string | null; related_type: string; related_id: string };

export function ImagesManager() {
  const [images, setImages] = useState<Img[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Img | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/precon/images").then((r) => r.json()),
      fetch("/api/admin/precon/image-assignments").then((r) => r.json()).catch(() => ({ assignments: [] })),
    ]).then(([imgData, assignData]) => {
      setImages(imgData.images ?? []);
      setAssignments(assignData.assignments ?? assignData.image_assignments ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function save(img: Img) {
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

  function usedIn(imageId: string) {
    return assignments.filter((a) => a.image_id === imageId);
  }

  if (loading) return <p className="text-sm text-muted">Loading images…</p>;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{images.length} images in the pool.</p>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {editing ? (
        <div className="card flex max-w-2xl flex-col gap-3">
          <strong className="text-base">Edit image</strong>
          {editing.image_url ? <img src={editing.image_url} alt="" className="h-32 w-auto rounded object-contain" /> : null}
          <label className="label">Alt text<input className="input" value={editing.alt_text ?? ""} onChange={(e) => setEditing({ ...editing, alt_text: e.target.value })} /></label>
          <label className="label">Sort order<input type="number" className="input" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></label>
          <div className="flex gap-2">
            <button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button>
            <button type="button" className="btn-primary" onClick={() => save(editing)}>Save</button>
          </div>
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {images.map((img) => {
          const uses = usedIn(img.id);
          return (
            <div key={img.id} className="flex gap-3 rounded-2xl bg-white p-3">
              {img.image_url ? <img src={img.image_url} alt={img.alt_text ?? ""} className="h-20 w-28 shrink-0 rounded-lg object-cover" /> : null}
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="truncate text-sm font-medium">{img.alt_text || "Untitled"}</div>
                <div className="mt-1 text-xs text-muted">
                  {uses.length ? (
                    <>Used in: {uses.map((u) => `${u.related_type} (${u.related_id.slice(0, 8)})`).join(", ")}</>
                  ) : (
                    "Not assigned"
                  )}
                </div>
                <div className="mt-auto flex gap-3 pt-2 text-xs">
                  <button className="font-medium text-primary" onClick={() => setEditing(img)}>Edit</button>
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
