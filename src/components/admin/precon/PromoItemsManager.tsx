"use client";
import { useEffect, useState } from "react";

export type PromoItem = {
  id: string;
  promo_id: string;
  title: string | null;
  badge: string | null;
  icon_url: string | null;
  description: string | null;
  sort_order: number | null;
  show: boolean | null;
};

function ItemForm({ initial, onSave, onCancel }: {
  initial: Partial<PromoItem>;
  onSave: (d: Partial<PromoItem>) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState<Partial<PromoItem>>(initial);
  const set = (k: string, v: any) => setD((x) => ({ ...x, [k]: v }));
  const [iconMode, setIconMode] = useState<"url" | "svg" | "library">(
    (d.icon_url ?? "").startsWith("<svg") || (d.icon_url ?? "").startsWith("svg:")
      ? "svg"
      : (d.icon_url ?? "").startsWith("icon:")
        ? "library"
        : "url"
  );
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-ground/50 p-4">
      <strong className="text-sm">{initial.id ? "Edit item" : "Add item"}</strong>
      <div className="grid grid-cols-2 gap-3">
        <label className="label">Title<input className="input" value={d.title ?? ""} onChange={(e) => set("title", e.target.value)} /></label>
        <label className="label">Badge<input className="input" placeholder="ZERO $" value={d.badge ?? ""} onChange={(e) => set("badge", e.target.value)} /></label>
      </div>
      <label className="label">Description<input className="input" value={d.description ?? ""} onChange={(e) => set("description", e.target.value)} /></label>
      <div className="label">Icon
        <div className="flex gap-2 pt-1">
          {(["url", "svg", "library"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setIconMode(m)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold ${iconMode === m ? "bg-ink text-white" : "bg-soft text-muted"}`}
            >
              {m === "url" ? "Image URL" : m === "svg" ? "Paste SVG" : "Icon Library"}
            </button>
          ))}
        </div>
      </div>
      {iconMode === "url" ? (
        <label className="label">Icon URL<input className="input" placeholder="https://…" value={(d.icon_url ?? "").startsWith("http") ? d.icon_url ?? "" : ""} onChange={(e) => set("icon_url", e.target.value)} /></label>
      ) : iconMode === "svg" ? (
        <label className="label">Paste SVG code<textarea className="textarea font-mono text-xs" rows={3} placeholder="<svg …>…</svg>" value={(d.icon_url ?? "").replace(/^svg:/, "")} onChange={(e) => set("icon_url", e.target.value.trim().startsWith("<") ? `svg:${e.target.value.trim()}` : e.target.value)} /></label>
      ) : (
        <label className="label">Choose icon
          <select className="input" value={(d.icon_url ?? "").replace(/^icon:/, "")} onChange={(e) => set("icon_url", e.target.value ? `icon:${e.target.value}` : "")}>
            <option value="">— None —</option>
            <option value="pool">Pool</option>
            <option value="gym">Gym / Fitness</option>
            <option value="park">Park / Green space</option>
            <option value="clubhouse">Clubhouse</option>
            <option value="playground">Playground</option>
            <option value="trail">Trails</option>
            <option value="security">Security / Gated</option>
            <option value="concierge">Concierge</option>
          </select>
        </label>
      )}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.show ?? true} onChange={(e) => set("show", e.target.checked)} /> Show</label>
      <div className="flex gap-2">
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn-primary" onClick={() => onSave(d)} disabled={!d.title?.trim()}>Save item</button>
      </div>
    </div>
  );
}

export function PromoItemsManager({ promoId }: { promoId: string }) {
  const [items, setItems] = useState<PromoItem[]>([]);
  const [editing, setEditing] = useState<Partial<PromoItem> | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`/api/admin/precon/promo-items?promo_id=${promoId}`).then((r) => r.json()).catch(() => ({}));
    setItems(res.items ?? []);
  }

  useEffect(() => { load(); }, [promoId]);

  async function save(d: Partial<PromoItem>) {
    setError("");
    const res = await fetch("/api/admin/precon/promo-items", {
      method: d.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d.id ? d : { ...d, promo_id: promoId }),
    });
    const body = await res.json();
    if (!res.ok) return setError(body.error || "Something went wrong.");
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/admin/precon/promo-items?id=${id}`, { method: "DELETE" });
    load();
  }

  async function toggleShow(item: PromoItem) {
    await fetch("/api/admin/precon/promo-items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, show: !item.show }),
    });
    load();
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line p-4">
      <div className="flex items-center justify-between">
        <strong className="text-sm">Sub-items ({items.length})</strong>
        {!editing ? (
          <button type="button" className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-white" onClick={() => setEditing({})}>
            + Add item
          </button>
        ) : null}
      </div>
      <p className="text-xs text-muted">Each item displays as its own block on the site. Faster than creating separate promos.</p>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {editing ? <ItemForm initial={editing} onSave={save} onCancel={() => setEditing(null)} /> : null}
      <div className="flex flex-col gap-2">
        {items.map((it) => (
          <div key={it.id} className={`flex items-center gap-3 rounded-lg bg-white px-3 py-2 ${it.show === false ? "opacity-50" : ""}`}>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{it.title}</div>
              {it.badge ? <div className="text-[11px] font-bold uppercase text-muted">{it.badge}</div> : null}
            </div>
            <button type="button" className="text-xs text-muted hover:text-ink" onClick={() => toggleShow(it)}>
              {it.show === false ? "Hidden" : "Shown"}
            </button>
            <button type="button" className="text-xs font-medium text-primary" onClick={() => setEditing(it)}>Edit</button>
            <button type="button" className="text-xs font-medium text-red-700" onClick={() => remove(it.id)}>Delete</button>
          </div>
        ))}
        {!items.length && !editing ? <p className="text-xs text-muted">No sub-items yet.</p> : null}
      </div>
    </div>
  );
}
