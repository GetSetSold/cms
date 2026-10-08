"use client";
import { useState } from "react";

const EXPIRIES = [
  { id: "24h", label: "24 hours" },
  { id: "3d", label: "3 days" },
  { id: "7d", label: "7 days" },
];

type Preview = { form_name: string; sections: number; answers: number };

/** Share a form (lead submission or attachment): preview what's included, pick expiry, copy link. */
export function ShareFormButton({ leadId, attachmentId, label }: { leadId: string; attachmentId?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [expiry, setExpiry] = useState("24h");
  const [link, setLink] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function create() {
    setBusy(true); setMsg(""); setPreview(null);
    try {
      const res = await fetch("/api/form-shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, attachment_id: attachmentId ?? null, expiry }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error ?? "Failed."); return; }
      setLink(data.url);
      setPreview(data.preview as Preview);
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
    <div className="flex flex-col gap-3">
      {!open ? (
        <button className="btn" onClick={() => setOpen(true)}>{label ?? "Share"}</button>
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
          {preview ? (
            <div className="rounded-xl bg-[#f7f7f7] p-3 text-[13px]">
              <strong>{preview.form_name}</strong>
              <p className="text-muted">{preview.sections} sections · {preview.answers} answers — this is what's in the link.</p>
            </div>
          ) : null}
          <input className="input font-mono text-xs" readOnly value={link} onFocus={(e) => e.target.select()} />
          <div className="flex gap-2">
            <button className="btn-primary" onClick={copy}>Copy link</button>
            <button className="btn" onClick={() => { setLink(""); setOpen(false); setMsg(""); setPreview(null); }}>Done</button>
          </div>
        </>
      )}
      {msg ? <p className="text-sm text-muted" role="status">{msg}</p> : null}
    </div>
  );
}
