"use client";
import { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@/lib/supabase/client";
import type { FeaturedListingRow } from "@/lib/featuredListings";

const SOURCE_LABEL: Record<string, string> = { brokerage: "Our brokerage", friend: "Friend agent", private: "Private" };
const SOURCE_STYLE: Record<string, string> = {
  brokerage: "bg-[#E4F0EE] text-[#0A4540]", friend: "bg-[#E6E9F7] text-[#2B3A8C]", private: "bg-[#EDEBFB] text-[#4B3F9E]",
};

function AddByMls({ onAdded }: { onAdded: (row: FeaturedListingRow) => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [key, setKey] = useState("");
  const [sourceType, setSourceType] = useState<"brokerage" | "friend">("brokerage");
  const [preview, setPreview] = useState<{ address: string; price: number | null; image: string | null } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function lookup() {
    setError(""); setPreview(null); setBusy(true);
    const mls = createBrowserClient(process.env.NEXT_PUBLIC_MLS_SUPABASE_URL!, process.env.NEXT_PUBLIC_MLS_SUPABASE_ANON_KEY!);
    const { data } = await mls.from("grid").select("UnparsedAddress,City,ListPrice,Media").eq("ListingKey", key.trim()).maybeSingle();
    setBusy(false);
    if (!data) return setError("No listing found with that MLS #. Double-check the number.");
    setPreview({ address: [data.UnparsedAddress, data.City].filter(Boolean).join(", "), price: data.ListPrice, image: data.Media });
  }

  async function add() {
    setBusy(true);
    const { data, error } = await supabase.from("featured_listings").insert({
      source_type: sourceType, listing_key: key.trim(), sort_order: 999,
    }).select("*").single();
    setBusy(false);
    if (error) return setError(error.message);
    onAdded(data as FeaturedListingRow);
    setKey(""); setPreview(null);
  }

  return (
    <div className="card flex flex-col gap-3">
      <strong className="text-sm">Add by MLS #</strong>
      <div className="flex gap-2">
        <select className="input w-40" value={sourceType} onChange={(e) => setSourceType(e.target.value as "brokerage" | "friend")}>
          <option value="brokerage">Our brokerage</option>
          <option value="friend">Friend agent</option>
        </select>
        <input className="input" placeholder="MLS # (e.g. 30238883)" value={key} onChange={(e) => setKey(e.target.value)} />
        <button className="btn" onClick={lookup} disabled={!key.trim() || busy}>Look up</button>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {preview ? (
        <div className="flex items-center gap-3 rounded-lg border border-line p-2.5">
          {preview.image ? <img src={preview.image} alt="" className="h-14 w-20 rounded-md object-cover" /> : <div className="h-14 w-20 rounded-md bg-soft" />}
          <div className="flex flex-col">
            <span className="font-medium">{preview.price ? `$${preview.price.toLocaleString()}` : "Call for price"}</span>
            <span className="text-sm text-muted">{preview.address}</span>
          </div>
          <button className="btn-primary ml-auto" onClick={add} disabled={busy}>Add to featured</button>
        </div>
      ) : null}
    </div>
  );
}

function AddPrivate({ onAdded }: { onAdded: (row: FeaturedListingRow) => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [d, setD] = useState({ address: "", price: "", bed: "", bath: "", sqft: "", image_url: "", link: "", note: "" });
  const [error, setError] = useState("");

  async function add() {
    setError("");
    const { data, error } = await supabase.from("featured_listings").insert({
      source_type: "private", listing_key: null, sort_order: 999,
      address: d.address, price: d.price ? Number(d.price) : null, bed: d.bed ? Number(d.bed) : null,
      bath: d.bath ? Number(d.bath) : null, sqft: d.sqft ? Number(d.sqft) : null,
      image_url: d.image_url || null, link: d.link || null, note: d.note || null,
    }).select("*").single();
    if (error) return setError(error.message);
    onAdded(data as FeaturedListingRow);
    setOpen(false);
    setD({ address: "", price: "", bed: "", bath: "", sqft: "", image_url: "", link: "", note: "" });
  }

  if (!open) return <button className="btn self-start" onClick={() => setOpen(true)}>+ Add private listing</button>;

  return (
    <div className="card flex max-w-xl flex-col gap-3">
      <strong className="text-sm">Private listing (no MLS #)</strong>
      <input className="input" placeholder="Address" value={d.address} onChange={(e) => setD({ ...d, address: e.target.value })} />
      <div className="grid grid-cols-3 gap-2">
        <input className="input" type="number" placeholder="Price" value={d.price} onChange={(e) => setD({ ...d, price: e.target.value })} />
        <input className="input" type="number" placeholder="Beds" value={d.bed} onChange={(e) => setD({ ...d, bed: e.target.value })} />
        <input className="input" type="number" placeholder="Baths" value={d.bath} onChange={(e) => setD({ ...d, bath: e.target.value })} />
      </div>
      <input className="input" type="number" placeholder="Sqft" value={d.sqft} onChange={(e) => setD({ ...d, sqft: e.target.value })} />
      <input className="input" placeholder="Photo URL" value={d.image_url} onChange={(e) => setD({ ...d, image_url: e.target.value })} />
      <input className="input" placeholder="Link (optional)" value={d.link} onChange={(e) => setD({ ...d, link: e.target.value })} />
      <input className="input" placeholder='Note badge (optional, e.g. "New")' value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="flex gap-2"><button className="btn" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" onClick={add} disabled={!d.address.trim()}>Save</button></div>
    </div>
  );
}

export function FeaturedListingsManager({ initial }: { initial: FeaturedListingRow[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState(initial);

  async function toggleActive(id: string, is_active: boolean) {
    await supabase.from("featured_listings").update({ is_active }).eq("id", id);
    setRows(rows.map((r) => (r.id === id ? { ...r, is_active } : r)));
  }
  async function move(i: number, dir: -1 | 1) {
    const next = [...rows];
    if (!next[i + dir]) return;
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    setRows(next);
    await Promise.all(next.map((r, idx) => supabase.from("featured_listings").update({ sort_order: idx }).eq("id", r.id)));
  }
  async function remove(id: string) {
    if (!confirm("Remove this from Featured Listings?")) return;
    await supabase.from("featured_listings").delete().eq("id", id);
    setRows(rows.filter((r) => r.id !== id));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <AddByMls onAdded={(row) => setRows([...rows, row])} />
        <AddPrivate onAdded={(row) => setRows([...rows, row])} />
      </div>

      <div className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <div key={r.id} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3">
            <div className="flex flex-col">
              <button aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="h-5 text-muted disabled:opacity-30">↑</button>
              <button aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)} className="h-5 text-muted disabled:opacity-30">↓</button>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${SOURCE_STYLE[r.source_type]}`}>{SOURCE_LABEL[r.source_type]}</span>
            <span className="font-medium">{r.listing_key ? `MLS# ${r.listing_key}` : r.address}</span>
            {r.note ? <span className="text-xs text-muted">"{r.note}"</span> : null}
            <label className="ml-auto flex items-center gap-1.5 text-sm text-muted">
              Active <input type="checkbox" checked={r.is_active} onChange={(e) => toggleActive(r.id, e.target.checked)} />
            </label>
            <button className="text-sm text-red-700" onClick={() => remove(r.id)}>Remove</button>
          </div>
        ))}
        {!rows.length ? <p className="py-8 text-center text-muted">No featured listings yet.</p> : null}
      </div>
    </div>
  );
}
