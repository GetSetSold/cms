"use client";
import { useEffect, useState } from "react";
import type { Amenity } from "@/lib/precon";

// Per-project amenity assignment: checkbox list against the shared library.
export function ProjectAmenitiesManager({ projectId }: { projectId: string }) {
  const [all, setAll] = useState<Amenity[]>([]);
  const [assigned, setAssigned] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [a, p] = await Promise.all([
          fetch("/api/admin/precon/amenities").then((r) => r.json()),
          fetch(`/api/admin/precon/project-amenities?project_id=${encodeURIComponent(projectId)}`).then((r) => r.json()),
        ]);
        if (a.error) throw new Error(a.error);
        if (p.error) throw new Error(p.error);
        setAll(a.amenities ?? []);
        setAssigned((p.project_amenities ?? []).map((x: any) => String(x.amenity_id)));
      } catch (e: any) { setError(e.message || "Could not load amenities."); }
      setLoading(false);
    })();
  }, [projectId]);

  async function toggle(amenityId: string, on: boolean) {
    setError("");
    if (on) {
      const res = await fetch("/api/admin/precon/project-amenities", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, amenity_id: amenityId }),
      });
      if (!res.ok) return setError((await res.json()).error || "Could not assign.");
      setAssigned([...assigned, amenityId]);
    } else {
      const res = await fetch(`/api/admin/precon/project-amenities?project_id=${encodeURIComponent(projectId)}&amenity_id=${encodeURIComponent(amenityId)}`, { method: "DELETE" });
      if (!res.ok) return setError((await res.json()).error || "Could not unassign.");
      setAssigned(assigned.filter((id) => id !== amenityId));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <strong className="text-sm">Amenities</strong>
        <span className="rounded-full bg-ground px-2 py-0.5 text-xs text-muted">{loading ? "…" : `${assigned.length}/${all.length}`}</span>
        <a href="/admin/precon/amenities" className="ml-auto text-xs font-medium text-primary hover:underline">Manage library →</a>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {all.length ? (
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {all.map((a) => (
            <label key={a.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-white px-2.5 py-2 text-sm hover:border-primary">
              <input
                type="checkbox"
                checked={assigned.includes(String(a.id))}
                onChange={(e) => toggle(String(a.id), e.target.checked)}
                className="h-4 w-4 shrink-0"
              />
              {a.icon_url ? <img src={a.icon_url} alt="" className="h-5 w-5 shrink-0 rounded object-contain" /> : null}
              <span className="min-w-0 truncate">{a.title}</span>
            </label>
          ))}
        </div>
      ) : !loading ? (
        <p className="text-xs text-muted">No amenities in the library yet — <a href="/admin/precon/amenities" className="font-medium text-primary hover:underline">add some</a>.</p>
      ) : null}
    </div>
  );
}
