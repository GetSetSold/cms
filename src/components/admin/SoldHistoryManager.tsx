"use client";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SoldHistoryRow } from "@/lib/soldHistory";

const STATUS_STYLE: Record<string, string> = {
  sold: "bg-[#E4F0EE] text-[#0A4540]",
  leased: "bg-[#E6E9F7] text-[#2B3A8C]",
  purchased: "bg-[#EDEBFB] text-[#4B3F9E]",
};

type Draft = Omit<SoldHistoryRow, "id" | "closed_at"> & { closed_at: string };

const emptyDraft = (): Draft => ({
  status: "sold", address: "", price: null, listed_price: null, image_url: "", link: "",
  bed: null, bath: null, parking: null, sqft: null, listing_key: null,
  closed_at: new Date().toISOString().slice(0, 10),
});

function RecordForm({ initial, onSave, onCancel }: { initial: Draft; onSave: (d: Draft) => void; onCancel: () => void }) {
  const [d, setD] = useState<Draft>(initial);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const num = (v: string) => (v === "" ? null : Number(v));
  const [lookupKey, setLookupKey] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);

  async function lookup() {
    setLookupError(""); setLookupBusy(true);
    const res = await fetch(`/api/admin/mls-lookup?key=${encodeURIComponent(lookupKey.trim())}`);
    const body = await res.json();
    setLookupBusy(false);
    if (!res.ok) return setLookupError(body.error || "Something went wrong.");
    const l = body.listing;
    setD((x) => ({
      ...x,
      address: [l.UnparsedAddress, l.City].filter(Boolean).join(", "),
      image_url: l.Media || x.image_url,
      listing_key: l.ListingKey,
      listed_price: l.ListPrice ?? x.listed_price,
    }));
  }

  return (
    <div className="card flex max-w-2xl flex-col gap-4">
      <strong className="text-base">{initial.address ? "Edit record" : "Add record"}</strong>

      <div className="flex flex-col gap-2 rounded-lg bg-ground p-3">
        <span className="text-xs font-medium text-muted">Optional: pre-fill from MLS # (only works if the listing hasn't been purged from the sync yet — log sales quickly for the best chance)</span>
        <div className="flex gap-2">
          <input className="input" placeholder="MLS #" value={lookupKey} onChange={(e) => setLookupKey(e.target.value)} />
          <button className="btn" onClick={lookup} disabled={!lookupKey.trim() || lookupBusy}>{lookupBusy ? "Looking up…" : "Look up"}</button>
        </div>
        {lookupError ? <p className="text-xs text-red-700">{lookupError}</p> : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="label">Status
          <select className="input" value={d.status} onChange={(e) => set("status", e.target.value as Draft["status"])}>
            <option value="sold">Sold</option>
            <option value="leased">Leased</option>
            <option value="purchased">Purchased</option>
          </select>
        </label>
        <label className="label">Closed date<input type="date" className="input" value={d.closed_at} onChange={(e) => set("closed_at", e.target.value)} /></label>
      </div>
      <label className="label">Address<input className="input" value={d.address} onChange={(e) => set("address", e.target.value)} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="label">Sold/leased price<input className="input" type="number" value={d.price ?? ""} onChange={(e) => set("price", num(e.target.value))} /></label>
        <label className="label">Listed price<input className="input" type="number" value={d.listed_price ?? ""} onChange={(e) => set("listed_price", num(e.target.value))} /></label>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <label className="label">Beds<input className="input" type="number" value={d.bed ?? ""} onChange={(e) => set("bed", num(e.target.value))} /></label>
        <label className="label">Baths<input className="input" type="number" value={d.bath ?? ""} onChange={(e) => set("bath", num(e.target.value))} /></label>
        <label className="label">Parking<input className="input" type="number" value={d.parking ?? ""} onChange={(e) => set("parking", num(e.target.value))} /></label>
        <label className="label">Sqft<input className="input" type="number" value={d.sqft ?? ""} onChange={(e) => set("sqft", num(e.target.value))} /></label>
      </div>
      <label className="label">Photo URL (a real link to the image — not from the SVG library)<input className="input" placeholder="https://…" value={d.image_url ?? ""} onChange={(e) => set("image_url", e.target.value)} /></label>
      <label className="label">Link (optional — makes the card clickable, e.g. a listing page or contact page)<input className="input" placeholder="https://…" value={d.link ?? ""} onChange={(e) => set("link", e.target.value)} /></label>
      <label className="label">MLS # (optional, reference only)<input className="input" value={d.listing_key ?? ""} onChange={(e) => set("listing_key", e.target.value)} /></label>
      <div className="flex gap-2">
        <button className="btn" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" onClick={() => onSave(d)} disabled={!d.address.trim()}>Save record</button>
      </div>
    </div>
  );
}

export function SoldHistoryManager({ initial }: { initial: SoldHistoryRow[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [error, setError] = useState("");

  const visible = filter ? rows.filter((r) => r.status === filter) : rows;
  const counts = { sold: rows.filter((r) => r.status === "sold").length, leased: rows.filter((r) => r.status === "leased").length, purchased: rows.filter((r) => r.status === "purchased").length };

  async function save(draft: Draft, id: string | null) {
    setError("");
    const { id: _drop, created_at: _c, updated_at: _u, ...rest } = draft as Draft & { id?: string; created_at?: string; updated_at?: string };
    const row = { ...rest, closed_at: new Date(draft.closed_at).toISOString() };
    if (id) {
      const { data, error } = await supabase.from("sold_history").update(row).eq("id", id).select("*").single();
      if (error) return setError(error.message);
      setRows(rows.map((r) => (r.id === id ? (data as SoldHistoryRow) : r)));
    } else {
      const { data, error } = await supabase.from("sold_history").insert(row).select("*").single();
      if (error) return setError(error.message);
      setRows([data as SoldHistoryRow, ...rows]);
    }
    setEditing(null);
  }

  async function remove(id: string) {
    if (!confirm("Delete this record?")) return;
    await supabase.from("sold_history").delete().eq("id", id);
    setRows(rows.filter((r) => r.id !== id));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <button className={`h-9 rounded-full px-4 text-sm font-medium ${!filter ? "bg-primary text-white" : "bg-white"}`} onClick={() => setFilter(null)}>All ({rows.length})</button>
        <button className={`h-9 rounded-full px-4 text-sm font-medium ${filter === "sold" ? "bg-primary text-white" : "bg-white"}`} onClick={() => setFilter("sold")}>Sold ({counts.sold})</button>
        <button className={`h-9 rounded-full px-4 text-sm font-medium ${filter === "leased" ? "bg-primary text-white" : "bg-white"}`} onClick={() => setFilter("leased")}>Leased ({counts.leased})</button>
        <button className={`h-9 rounded-full px-4 text-sm font-medium ${filter === "purchased" ? "bg-primary text-white" : "bg-white"}`} onClick={() => setFilter("purchased")}>Purchased ({counts.purchased})</button>
        <button className="btn-primary ml-auto" onClick={() => setEditing({ id: null, draft: emptyDraft() })}>+ Add record</button>
      </div>

      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}

      {editing ? (
        <RecordForm
          initial={editing.draft}
          onCancel={() => setEditing(null)}
          onSave={(d) => save(d, editing.id)}
        />
      ) : null}

      <div className="overflow-hidden rounded-2xl bg-white">
        <table className="w-full text-left">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <tr><th className="w-16 p-4"></th><th className="p-4">Address</th><th className="p-4">Price</th><th className="p-4">Beds/Baths</th><th className="p-4">Status</th><th className="p-4">Closed</th><th className="w-16 p-4"></th></tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id} className="border-b border-line/60 last:border-0 hover:bg-ground/60">
                <td className="p-4">{r.image_url ? <img src={r.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <div className="h-10 w-10 rounded-lg bg-soft" />}</td>
                <td className="p-4 font-medium">{r.address}</td>
                <td className="p-4">{r.price ? `$${r.price.toLocaleString()}` : "—"}</td>
                <td className="p-4 text-muted">{r.bed ?? "—"} / {r.bath ?? "—"}</td>
                <td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[r.status]}`}>{r.status}</span></td>
                <td className="p-4 text-muted">{new Date(r.closed_at).toLocaleDateString()}</td>
                <td className="p-4">
                  <div className="flex gap-3 text-xs">
                    <button className="font-medium text-primary" onClick={() => setEditing({ id: r.id, draft: { ...r, closed_at: r.closed_at.slice(0, 10) } })}>Edit</button>
                    <button className="font-medium text-red-700" onClick={() => remove(r.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!visible.length ? <tr><td colSpan={7} className="p-8 text-center text-muted">No records yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
