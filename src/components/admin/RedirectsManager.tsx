"use client";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { normalizeRedirectDestination, normalizeRedirectSource } from "@/lib/redirect-paths";

type RedirectRow = {
  id: string;
  source: string;
  destination: string;
  permanent: boolean;
  is_active: boolean;
  created_at?: string;
};

function validate(
  sourceRaw: string,
  destRaw: string,
  rows: RedirectRow[],
  selfId: string | null,
  pageSlugs: string[],
): string {
  const source = normalizeRedirectSource(sourceRaw);
  if (!source) return "Enter a source path, e.g. old-page or rohit.";
  if (pageSlugs.includes(source)) {
    return `/${source} is already a live page — a redirect can never override a real page, so this source would never fire.`;
  }
  const destination = normalizeRedirectDestination(destRaw);
  if (!destination) return "Destination must be an internal path starting with /, e.g. /rohit-sharma-realtor. External URLs are not allowed in v1.";
  if (destination.split("?")[0].slice(1) === source) return "A URL cannot redirect to itself.";
  if (rows.some((r) => r.source === source && r.id !== selfId)) {
    return `/${source} already has a redirect — edit that row instead of adding a duplicate.`;
  }
  // Two-cycle guard: A -> B is blocked if B -> A already exists, or the
  // browser would bounce between the two forever.
  const destSlug = destination.split("?")[0].slice(1);
  const back = rows.find((r) => r.source === destSlug && r.is_active);
  if (back && normalizeRedirectDestination(back.destination).split("?")[0].slice(1) === source) {
    return `/${destSlug} already redirects back to /${source} — that would loop forever.`;
  }
  return "";
}

function Row({
  row, rows, pageSlugs, onSaved, onDeleted,
}: {
  row: RedirectRow; rows: RedirectRow[]; pageSlugs: string[];
  onSaved: (r: RedirectRow) => void; onDeleted: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [source, setSource] = useState(row.source);
  const [destination, setDestination] = useState(row.destination);
  const [permanent, setPermanent] = useState(row.permanent);
  const [active, setActive] = useState(row.is_active);
  const [msg, setMsg] = useState("");

  async function save() {
    const err = validate(source, destination, rows, row.id, pageSlugs);
    if (err) { setMsg(err); return; }
    const patch = {
      source: normalizeRedirectSource(source),
      destination: normalizeRedirectDestination(destination),
      permanent, is_active: active, updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("redirects").update(patch).eq("id", row.id);
    if (error) { setMsg(error.message); return; }
    setMsg("Saved");
    onSaved({ ...row, ...patch });
  }

  async function remove() {
    if (!confirm(`Delete the redirect /${row.source} → ${row.destination}?`)) return;
    const { error } = await supabase.from("redirects").delete().eq("id", row.id);
    if (error) { setMsg(error.message); return; }
    onDeleted();
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">/</span>
        <input className="input w-56" value={source} onChange={(e) => setSource(e.target.value)} aria-label="Source path" />
        <span className="text-muted">→</span>
        <input className="input flex-1 min-w-56" value={destination} onChange={(e) => setDestination(e.target.value)} aria-label="Destination path" />
        <label className="flex items-center gap-1.5 text-sm">
          <select className="input" value={permanent ? "301" : "302"} onChange={(e) => setPermanent(e.target.value === "301")} aria-label="Redirect type">
            <option value="301">301 permanent</option>
            <option value="302">302 temporary</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active
        </label>
        <button type="button" onClick={save} className="btn h-8 px-3 text-xs">Save</button>
        <button type="button" onClick={remove} className="text-sm text-red-700">Delete</button>
        <a href={`/${row.source}`} target="_blank" rel="noreferrer" className="text-sm text-primary">Test ↗</a>
      </div>
      {msg ? <span className="text-xs text-muted">{msg}</span> : null}
    </div>
  );
}

export function RedirectsManager({ initial, pageSlugs }: { initial: RedirectRow[]; pageSlugs: string[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState(initial);
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [permanent, setPermanent] = useState(true);
  const [msg, setMsg] = useState("");

  async function add() {
    const err = validate(source, destination, rows, null, pageSlugs);
    if (err) { setMsg(err); return; }
    const insert = {
      source: normalizeRedirectSource(source),
      destination: normalizeRedirectDestination(destination),
      permanent, is_active: true,
    };
    const { data, error } = await supabase.from("redirects").insert(insert).select("*").single();
    if (error) { setMsg(error.message); return; }
    if (data) {
      setRows([...rows, data as RedirectRow]);
      setSource(""); setDestination(""); setPermanent(true); setMsg("Added — live on the next hit of that URL, no deploy needed.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4">
        <p className="text-sm font-semibold">Add a redirect</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">/</span>
          <input className="input w-56" value={source} onChange={(e) => setSource(e.target.value)} placeholder="old-page" aria-label="Source path" />
          <span className="text-muted">→</span>
          <input className="input flex-1 min-w-56" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="/rohit-sharma-realtor" aria-label="Destination path" />
          <select className="input" value={permanent ? "301" : "302"} onChange={(e) => setPermanent(e.target.value === "301")} aria-label="Redirect type">
            <option value="301">301 permanent</option>
            <option value="302">302 temporary</option>
          </select>
          <button type="button" onClick={add} className="btn h-10 px-4 text-sm">Add redirect</button>
        </div>
        {msg ? <span className="text-xs text-muted">{msg}</span> : null}
        <p className="text-xs text-muted">
          A redirect fires only when its source would otherwise 404 as a CMS page — real pages and
          real routes always win. Destinations are internal paths only in v1 (no external URLs).
          Use 301 for a permanent move (old page gone for good, e.g. a renamed page) and 302 for a
          temporary one (a short link you may point elsewhere later).
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {rows.length ? rows.map((r) => (
          <Row key={r.id} row={r} rows={rows} pageSlugs={pageSlugs}
            onSaved={(next) => setRows(rows.map((x) => (x.id === next.id ? next : x)))}
            onDeleted={() => setRows(rows.filter((x) => x.id !== r.id))} />
        )) : <p className="text-sm text-muted">No redirects yet. System redirects (city legacy URLs, listing slugs, /rohit) still live in code — this table is for page and short-link redirects.</p>}
      </div>
    </div>
  );
}
