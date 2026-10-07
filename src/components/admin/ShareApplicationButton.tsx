"use client";
import { useState } from "react";

const EXPIRIES = [
  { id: "24h", label: "24 hours" },
  { id: "3d", label: "3 days" },
  { id: "7d", label: "7 days" },
];

/** Share button for rental application leads: creates an expiring branded link. */
export function ShareApplicationButton({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false);
  const [expiry, setExpiry] = useState("24h");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function create() {
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/application-shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, expiry }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error ?? "Failed."); return; }
      setLink(data.url);
    } catch {
      setMsg("Failed.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(link); setMsg("Copied."); }
    catch { setMsg("Copy failed — select the link manually."); }
  }

  return (
    <div className="card flex flex-col gap-3">
      <strong>Share application</strong>
      {!open ? (
        <>
          <p className="text-[13px] text-muted">Branded link for another agent. Expires automatically.</p>
          <button className="btn" onClick={() => setOpen(true)}>Create share link</button>
        </>
      ) : !link ? (
        <>
          <label className="label">Link expires after
            <select className="input" value={expiry} onChange={(e) => setExpiry(e.target.value)}>
              {EXPIRIES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>
          <div className="flex gap-2">
            <button className="btn-primary" disabled={busy} onClick={create}>{busy ? "Creating…" : "Create link"}</button>
            <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          <input className="input font-mono text-xs" readOnly value={link} onFocus={(e) => e.target.select()} />
          <div className="flex gap-2">
            <button className="btn-primary" onClick={copy}>Copy link</button>
            <button className="btn" onClick={() => { setLink(""); setOpen(false); setMsg(""); }}>Done</button>
          </div>
        </>
      )}
      {msg ? <p className="text-sm text-muted" role="status">{msg}</p> : null}
    </div>
  );
}
