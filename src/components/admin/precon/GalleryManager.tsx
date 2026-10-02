"use client";
import { useEffect, useState } from "react";

type Row = Record<string, any>;

const SKIP = new Set(["id", "created_at", "updated_at"]);
const FALLBACK_COLS = ["id", "url", "title", "sort_order"];

// Renders a raw-data form for whatever columns the images table actually has.
export function GalleryManager({ relatedType, relatedId }: { relatedType: string; relatedId: string }) {
  const [imgCols, setImgCols] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<Row[]>([]);
  const [images, setImages] = useState<Record<string, Row>>({});
  const [draft, setDraft] = useState<Row | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const editableCols = imgCols.filter((c) => !SKIP.has(c));
  const urlCol = imgCols.find((c) => /^(url|image_url|src|path)$/i.test(c)) ?? imgCols.find((c) => /url|image/i.test(c));
  const canSort = imgCols.includes("sort_order");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [cs, as] = await Promise.all([
        fetch("/api/admin/precon/schema?table=images").then((r) => r.json()),
        fetch(`/api/admin/precon/image-assignments?related_type=${encodeURIComponent(relatedType)}&related_id=${encodeURIComponent(relatedId)}`).then((r) => r.json()),
      ]);
      if (cs.error) throw new Error(cs.error);
      const cols: string[] = cs.columns?.length ? cs.columns : FALLBACK_COLS;
      setImgCols(cols);
      const list: Row[] = as.image_assignments ?? [];
      setAssignments(list);
      const ids = [...new Set(list.map((a) => String(a.image_id)).filter(Boolean))];
      if (ids.length) {
        const ir = await fetch(`/api/admin/precon/images?ids=${ids.join(",")}`).then((r) => r.json());
        const map: Record<string, Row> = {};
        (ir.images ?? []).forEach((im: Row) => { map[String(im.id)] = im; });
        setImages(map);
      } else {
        setImages({});
      }
    } catch (e: any) { setError(e.message || "Could not load gallery."); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [relatedType, relatedId]);

  const ordered = assignments
    .map((a) => images[String(a.image_id)])
    .filter(Boolean)
    .sort((a, b) => (canSort ? (a.sort_order ?? 9999) - (b.sort_order ?? 9999) : 0));

  async function addImage() {
    if (!draft) return;
    setError("");
    const clean: Row = {};
    editableCols.forEach((c) => { if (draft[c] !== "" && draft[c] !== undefined) clean[c] = draft[c]; });
    const res = await fetch("/api/admin/precon/images", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(clean),
    });
    const body = await res.json();
    if (!res.ok) return setError(body.error || "Could not create image.");
    const img = body.image as Row;
    const ares = await fetch("/api/admin/precon/image-assignments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_id: img.id, related_type: relatedType, related_id: relatedId }),
    });
    const abody = await ares.json();
    if (!ares.ok) return setError(abody.error || "Image saved but could not be assigned.");
    setDraft(null);
    load();
  }

  async function unassign(imageId: string) {
    if (!confirm("Remove this image from the gallery? (The image itself is kept.)")) return;
    const res = await fetch(`/api/admin/precon/image-assignments?image_id=${encodeURIComponent(imageId)}&related_type=${encodeURIComponent(relatedType)}&related_id=${encodeURIComponent(relatedId)}`, { method: "DELETE" });
    if (!res.ok) return setError((await res.json()).error || "Could not unassign.");
    load();
  }

  async function deleteImage(imageId: string) {
    if (!confirm("Delete this image entirely?")) return;
    await fetch(`/api/admin/precon/image-assignments?image_id=${encodeURIComponent(imageId)}&related_type=${encodeURIComponent(relatedType)}&related_id=${encodeURIComponent(relatedId)}`, { method: "DELETE" });
    const res = await fetch(`/api/admin/precon/images/${encodeURIComponent(imageId)}`, { method: "DELETE" });
    if (!res.ok) return setError((await res.json()).error || "Could not delete image.");
    load();
  }

  async function move(imageId: string, dir: -1 | 1) {
    if (!canSort) return;
    const i = ordered.findIndex((im) => String(im.id) === String(imageId));
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ordered.length) return;
    const a = ordered[i], b = ordered[j];
    const av = a.sort_order ?? i, bv = b.sort_order ?? j;
    await Promise.all([
      fetch(`/api/admin/precon/images/${encodeURIComponent(String(a.id))}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sort_order: bv }) }),
      fetch(`/api/admin/precon/images/${encodeURIComponent(String(b.id))}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sort_order: av }) }),
    ]);
    load();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <strong className="text-sm">Gallery</strong>
        <span className="rounded-full bg-ground px-2 py-0.5 text-xs text-muted">{loading ? "…" : ordered.length}</span>
        <button type="button" className="btn ml-auto h-8 px-3 text-xs" onClick={() => setDraft({})}>+ Add image</button>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {draft ? (
        <div className="flex flex-col gap-2 rounded-lg bg-ground p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {editableCols.map((c) => (
              <label key={c} className="label">{c.replace(/_/g, " ")}
                <input className="input" value={draft[c] ?? ""} onChange={(e) => setDraft({ ...draft, [c]: e.target.value })} />
              </label>
            ))}
          </div>
          {!editableCols.length ? <p className="text-xs text-muted">No editable columns detected.</p> : null}
          <div className="flex gap-2">
            <button type="button" className="btn h-8 px-3 text-xs" onClick={() => setDraft(null)}>Cancel</button>
            <button type="button" className="btn-primary h-8 px-3 text-xs" onClick={addImage}>Save & assign</button>
          </div>
        </div>
      ) : null}
      {ordered.map((im) => (
        <div key={String(im.id)} className="flex items-center gap-3 rounded-lg border border-line bg-white p-2">
          {urlCol && im[urlCol]
            ? <img src={im[urlCol]} alt="" className="h-12 w-16 shrink-0 rounded object-cover" />
            : <div className="h-12 w-16 shrink-0 rounded bg-soft" />}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{im.title ?? im.name ?? `Image ${String(im.id).slice(0, 8)}`}</div>
            <div className="truncate text-xs text-muted">{urlCol ? im[urlCol] : null}</div>
          </div>
          {canSort ? (
            <div className="flex shrink-0 flex-col">
              <button type="button" aria-label="Move up" onClick={() => move(String(im.id), -1)} className="flex h-5 w-6 items-center justify-center text-muted hover:text-ink">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 15 6-6 6 6" /></svg>
              </button>
              <button type="button" aria-label="Move down" onClick={() => move(String(im.id), 1)} className="flex h-5 w-6 items-center justify-center text-muted hover:text-ink">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
              </button>
            </div>
          ) : null}
          <div className="flex shrink-0 gap-3 text-xs">
            <button type="button" className="font-medium text-muted" onClick={() => unassign(String(im.id))}>Unassign</button>
            <button type="button" className="font-medium text-red-700" onClick={() => deleteImage(String(im.id))}>Delete</button>
          </div>
        </div>
      ))}
      {!loading && !ordered.length && !draft ? <p className="text-xs text-muted">No gallery images yet.</p> : null}
    </div>
  );
}
