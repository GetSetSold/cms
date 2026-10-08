"use client";
import { useEffect, useState } from "react";

type Share = {
  token: string;
  url: string;
  form_name: string;
  expires_at: string;
  view_count: number;
  created_at: string;
};

/** Active share links for a lead: what, when, views — revoke or refresh. */
export function ShareManager({ leadId }: { leadId: string }) {
  const [shares, setShares] = useState<Share[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/form-shares?lead_id=${leadId}`);
    const data = await res.json();
    if (res.ok) setShares(data.shares as Share[]);
  }
  useEffect(() => { load(); }, [leadId]);

  async function revoke(token: string) {
    if (!confirm("Revoke this link? It will stop working immediately.")) return;
    setBusy(token);
    await fetch(`/api/form-shares/${token}`, { method: "DELETE" });
    setBusy(null); load();
  }

  async function refresh(token: string) {
    setBusy(token); setMsg("");
    const res = await fetch(`/api/form-shares/${token}/refresh`, { method: "POST" });
    const data = await res.json();
    setBusy(null);
    setMsg(res.ok ? "Share updated with current answers." : (data.error ?? "Failed."));
    load();
  }

  if (!shares.length) return null;

  return (
    <div className="card flex flex-col gap-3">
      <strong>Active share links</strong>
      {msg ? <p className="text-sm text-muted" role="status">{msg}</p> : null}
      {shares.map((s) => (
        <div key={s.token} className="flex flex-col gap-2 rounded-xl bg-[#f7f7f7] p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-[14px]">{s.form_name}</p>
              <p className="text-xs text-muted">
                Expires {new Date(s.expires_at).toLocaleDateString()} · {s.view_count} view{s.view_count === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button className="btn h-8 px-3 text-[12px]" disabled={busy === s.token} onClick={() => refresh(s.token)}>
                Refresh
              </button>
              <button className="btn h-8 px-3 text-[12px] border-red-200 text-red-600 hover:bg-red-50" disabled={busy === s.token} onClick={() => revoke(s.token)}>
                Revoke
              </button>
            </div>
          </div>
          <input className="input font-mono text-xs" readOnly value={s.url} onFocus={(e) => e.target.select()} />
        </div>
      ))}
      <p className="text-xs text-muted">Shares are snapshots. If you edit answers after sharing, hit Refresh to update the link — same URL.</p>
    </div>
  );
}
