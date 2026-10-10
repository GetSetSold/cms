"use client";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { FeaturedListingRow, FeaturedMlsDetails } from "@/lib/featuredListings";

const SOURCE_LABEL: Record<string, string> = { brokerage: "Our brokerage", friend: "Friend agent", private: "Private" };
const SOURCE_STYLE: Record<string, string> = {
  brokerage: "bg-[#E4F0EE] text-[#0A4540]", friend: "bg-[#E6E9F7] text-[#2B3A8C]", private: "bg-[#EDEBFB] text-[#4B3F9E]",
};

function PullByOffice({ initialOfficeKey, existingKeys, onAdded }: { initialOfficeKey: string; existingKeys: Set<string>; onAdded: (rows: FeaturedListingRow[]) => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [officeKey, setOfficeKey] = useState(initialOfficeKey);
  const [results, setResults] = useState<{ ListingKey: string; UnparsedAddress: string | null; City: string | null; ListPrice: number | null; Media: string | null }[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function fetchListings() {
    setError(""); setResults(null); setBusy(true);
    const res = await fetch(`/api/admin/mls-by-office?office=${encodeURIComponent(officeKey.trim())}`);
    const body = await res.json();
    setBusy(false);
    if (!res.ok) return setError(body.error || "Something went wrong.");
    setResults(body.listings);
    setSelected(new Set(body.listings.filter((l: any) => !existingKeys.has(l.ListingKey)).map((l: any) => l.ListingKey)));
  }

  async function addSelected() {
    setBusy(true);
    const toAdd = [...selected].map((key) => ({ source_type: "brokerage" as const, listing_key: key, sort_order: 999 }));
    const { data, error } = await supabase.from("featured_listings").insert(toAdd).select("*");
    setBusy(false);
    if (error) return setError(error.message);
    onAdded(data as FeaturedListingRow[]);
    setResults(null); setSelected(new Set());
  }

  return (
    <div className="card flex flex-col gap-3">
      <strong className="text-sm">Pull all listings for your brokerage</strong>
      <p className="text-xs text-muted">Every active listing under your office key, in one go — pick which ones to feature.</p>
      <div className="flex gap-2">
        <input className="input" placeholder="Office key (ListOfficeKey)" value={officeKey} onChange={(e) => setOfficeKey(e.target.value)} />
        <button className="btn" onClick={fetchListings} disabled={!officeKey.trim() || busy}>Fetch listings</button>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {results ? (
        <div className="flex flex-col gap-2">
          <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
            {results.map((l) => {
              const already = existingKeys.has(l.ListingKey);
              return (
                <label key={l.ListingKey} className={`flex items-center gap-3 rounded-lg border border-line p-2 ${already ? "opacity-50" : ""}`}>
                  <input type="checkbox" disabled={already} checked={selected.has(l.ListingKey)}
                    onChange={(e) => setSelected((s) => { const n = new Set(s); e.target.checked ? n.add(l.ListingKey) : n.delete(l.ListingKey); return n; })} />
                  {l.Media ? <img src={l.Media} alt="" className="h-10 w-14 rounded-md object-cover" /> : <div className="h-10 w-14 rounded-md bg-soft" />}
                  <div className="flex flex-col text-sm">
                    <span className="font-medium">{l.ListPrice ? `$${l.ListPrice.toLocaleString()}` : "Call for price"}</span>
                    <span className="text-muted">{[l.UnparsedAddress, l.City].filter(Boolean).join(", ")}</span>
                  </div>
                  {already ? <span className="ml-auto text-xs text-muted">Already added</span> : null}
                </label>
              );
            })}
          </div>
          <button className="btn-primary self-start" onClick={addSelected} disabled={!selected.size || busy}>Add {selected.size} selected</button>
        </div>
      ) : null}
    </div>
  );
}

function AddByMls({ onAdded }: { onAdded: (row: FeaturedListingRow) => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [key, setKey] = useState("");
  const [sourceType, setSourceType] = useState<"brokerage" | "friend">("brokerage");
  const [preview, setPreview] = useState<{ listingKey: string; address: string; price: number | null; image: string | null } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function clear() {
    setKey(""); setPreview(null); setError("");
  }

  async function lookup() {
    setError(""); setPreview(null); setBusy(true);
    const res = await fetch(`/api/admin/mls-lookup?key=${encodeURIComponent(key.trim())}`);
    const body = await res.json();
    setBusy(false);
    if (!res.ok) return setError(body.error || "Something went wrong.");
    const data = body.listing;
    setPreview({ listingKey: data.ListingKey, address: [data.UnparsedAddress, data.City].filter(Boolean).join(", "), price: data.ListPrice, image: data.Media });
  }

  async function add() {
    if (!preview) return;
    setBusy(true);
    const { data, error } = await supabase.from("featured_listings").insert({
      source_type: sourceType, listing_key: preview.listingKey, sort_order: 999,
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
        {key || preview || error ? <button className="btn" onClick={clear}>Clear</button> : null}
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

export function FeaturedListingsManager({ initial, initialOfficeKey, details }: { initial: FeaturedListingRow[]; initialOfficeKey: string; details: Record<string, FeaturedMlsDetails> }) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState(initial);
  const [opError, setOpError] = useState("");
  const existingKeys = useMemo(() => new Set(rows.map((r) => r.listing_key).filter((k): k is string => !!k)), [rows]);

  async function toggleActive(id: string, is_active: boolean) {
    setOpError("");
    const { error } = await supabase.from("featured_listings").update({ is_active }).eq("id", id);
    if (error) { setOpError(`Couldn't save: ${error.message}`); return; }
    setRows(rows.map((r) => (r.id === id ? { ...r, is_active } : r)));
  }
  async function move(i: number, dir: -1 | 1) {
    setOpError("");
    const next = [...rows];
    if (!next[i + dir]) return;
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    setRows(next);
    const results = await Promise.all(next.map((r, idx) => supabase.from("featured_listings").update({ sort_order: idx }).eq("id", r.id)));
    const firstError = results.find((x) => x.error)?.error;
    if (firstError) setOpError(`Couldn't save order: ${firstError.message}`);
  }
  async function remove(id: string) {
    if (!confirm("Remove this from Featured Listings?")) return;
    setOpError("");
    const { error } = await supabase.from("featured_listings").delete().eq("id", id);
    if (error) { setOpError(`Couldn't remove: ${error.message}`); return; }
    setRows(rows.filter((r) => r.id !== id));
  }

  return (
    <div className="flex flex-col gap-5">
      <PullByOffice initialOfficeKey={initialOfficeKey} existingKeys={existingKeys} onAdded={(added) => setRows([...rows, ...added])} />

      <div className="grid gap-4 md:grid-cols-2">
        <AddByMls onAdded={(row) => setRows([...rows, row])} />
        <AddPrivate onAdded={(row) => setRows([...rows, row])} />
      </div>

      {opError ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{opError}</p> : null}
      <div className="flex flex-col gap-2">
        {rows.map((r, i) => {
          const d = r.listing_key ? details[r.listing_key] : undefined;
          return (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3">
              <div className="flex flex-col">
                <button aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="h-5 text-muted disabled:opacity-30">↑</button>
                <button aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)} className="h-5 text-muted disabled:opacity-30">↓</button>
              </div>
              {d?.image ? <img src={d.image} alt="" className="h-12 w-16 shrink-0 rounded-md object-cover" /> : null}
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${SOURCE_STYLE[r.source_type]}`}>{SOURCE_LABEL[r.source_type]}</span>
                  {d ? (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${d.isSale ? "bg-[#E7F5EC] text-[#0F7A3D]" : "bg-[#EAF1FD] text-[#1D4ED8]"}`}>
                      {d.isSale ? "For Sale" : "For Rent"}
                    </span>
                  ) : null}
                </div>
                {r.listing_key ? (
                  d ? (
                    <>
                      <span className="truncate text-sm font-medium">{[d.address, d.city].filter(Boolean).join(", ") || "Address unavailable"}</span>
                      <span className="text-xs text-muted">
                        {d.price ? `$${d.price.toLocaleString()}` : "Call for price"} · MLS# {d.listingId ?? r.listing_key}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-amber-700">MLS# {r.listing_key} — no longer resolves (sold/expired?)</span>
                  )
                ) : (
                  <>
                    <span className="truncate text-sm font-medium">{r.address}</span>
                    <span className="text-xs text-muted">{r.price ? `$${Number(r.price).toLocaleString()}` : "Call for price"}</span>
                  </>
                )}
                {r.note ? <span className="text-xs text-muted">"{r.note}"</span> : null}
              </div>
              <label className="ml-auto flex shrink-0 items-center gap-1.5 text-sm text-muted">
                Active <input type="checkbox" checked={r.is_active} onChange={(e) => toggleActive(r.id, e.target.checked)} />
              </label>
              <button className="shrink-0 text-sm text-red-700" onClick={() => remove(r.id)}>Remove</button>
            </div>
          );
        })}
        {!rows.length ? <p className="py-8 text-center text-muted">No featured listings yet.</p> : null}
      </div>
    </div>
  );
}
