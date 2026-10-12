"use client";
import { useEffect, useState } from "react";
import { LibraryPicker } from "./LibraryPicker";
import type { Promo } from "@/lib/precon";

export function ProjectPromosManager({ projectId }: { projectId: string }) {
  const [linked, setLinked] = useState<Promo[]>([]);
  const [library, setLibrary] = useState<Promo[]>([]);
  const [picking, setPicking] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [linkedRes, libRes] = await Promise.all([
      fetch(`/api/admin/precon/promo-projects?project_id=${projectId}`).then((r) => r.json()).catch(() => ({})),
      fetch("/api/admin/precon/promos").then((r) => r.json()).catch(() => ({})),
    ]);
    setLinked(linkedRes.promos ?? []);
    setLibrary(libRes.promos ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [projectId]);

  async function add(promo: Promo) {
    await fetch("/api/admin/precon/promo-projects", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promo_id: promo.id, project_id: projectId }),
    });
    load();
  }

  async function remove(promoId: string) {
    await fetch(`/api/admin/precon/promo-projects?promo_id=${promoId}&project_id=${projectId}`, { method: "DELETE" });
    load();
  }

  const available = library.filter((p) => !linked.some((l) => l.id === p.id));

  if (loading) return <p className="text-xs text-muted">Loading promos…</p>;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">Promos ({linked.length})</span>
        <button type="button" className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-white" onClick={() => setPicking(true)}>
          + Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {linked.map((p) => (
          <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium">
            {p.badge ? <b className="uppercase">{p.badge}</b> : null} {p.title}
            <button type="button" onClick={() => remove(p.id)} className="ml-1 text-muted hover:text-red-700" aria-label="Remove">×</button>
          </span>
        ))}
        {!linked.length ? <span className="text-xs text-muted">No promos linked.</span> : null}
      </div>
      {picking ? (
        <LibraryPicker
          title="Add promo to project"
          items={available}
          getSearchText={(p) => `${p.title ?? ""} ${p.badge ?? ""}`}
          renderItem={(p) => (
            <>
              {p.badge ? <span className="rounded bg-soft px-2 py-0.5 text-[11px] font-bold uppercase">{p.badge}</span> : null}
              <span className="text-sm">{p.title}</span>
            </>
          )}
          onPick={add}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </div>
  );
}
