"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ShareFormButton } from "./ShareFormButton";

type FormField = {
  key: string; label: string; type: string; options?: string[];
  subfields?: FormField[]; repeat_label?: string;
};
type FormSection = { id: string; heading?: string; fields: FormField[] };

export type FormSubmission = {
  id: string; // attachment id or "main"
  formName: string;
  formKey?: string;
  subtitle: string;
  answers: Record<string, unknown>;
  sections: FormSection[];
  onSave: (answers: Record<string, unknown>) => Promise<string | null>; // returns error or null
  onDeleted?: () => void;
};

function renderAnswer(v: unknown): string {
  if (v == null || v === "") return "—";
  if (Array.isArray(v)) {
    if (v.length && typeof v[0] === "object") return `${v.length} ${v.length === 1 ? "entry" : "entries"}`;
    return v.map(String).join(", ");
  }
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

function SubformTable({ rows, subfields }: { rows: Record<string, unknown>[]; subfields?: { key: string; label: string }[] }) {
  const labelFor = (key: string) => subfields?.find((sf) => sf.key === key)?.label ?? key.replace(/_/g, " ");
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, i) => (
        <div key={i} className="overflow-hidden rounded-lg border border-line">
          <div className="bg-[#111] px-3 py-1 text-[11px] font-semibold text-white">Entry {i + 1}</div>
          <table className="w-full text-[13px]">
            <tbody>
              {Object.entries(row).filter(([, v]) => v != null && v !== "").map(([k, v]) => (
                <tr key={k} className="border-t border-line/60 first:border-0">
                  <td className="w-2/5 bg-[#f7f7f7] px-3 py-1.5 align-top text-[11px] font-medium uppercase tracking-wide text-muted">{labelFor(k)}</td>
                  <td className="px-3 py-1.5">{String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

type Share = { token: string; url: string; expires_at: string; view_count: number; created_at: string };

/** Unified form submission card: expand, edit (prefilled + subforms), share with per-form link history, start flow. */
export function FormSubmissionCard({ submission }: { submission: FormSubmission }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [shares, setShares] = useState<Share[]>([]);
  const [flows, setFlows] = useState<{ id: string; name: string }[]>([]);
  const [flowOpen, setFlowOpen] = useState(false);
  const [flowId, setFlowId] = useState("");
  const [msg, setMsg] = useState("");

  const attachmentId = submission.id === "main" ? null : submission.id;

  useEffect(() => {
    const sb = createClient();
    // Load shares for this specific submission.
    sb.from("form_shares").select("token,expires_at,view_count,created_at")
      .eq("lead_id", (submission as unknown as { leadId: string }).leadId)
      .then(({ data }) => {
        // Filter by attachment_id client-side (RLS-safe).
        const all = (data ?? []) as (Share & { attachment_id: string | null })[];
        const mine = all.filter((s) => (s.attachment_id ?? null) === attachmentId);
        setShares(mine.map((s) => ({ ...s, url: `${window.location.origin}/shared/application/${s.token}` })));
      });
    sb.from("lead_flows").select("id,name").eq("is_active", true).order("name")
      .then(({ data }) => setFlows((data ?? []) as { id: string; name: string }[]));
  }, [submission.id]);

  async function revoke(token: string) {
    if (!confirm("Revoke this link? It will stop working immediately.")) return;
    const { error } = await createClient().from("form_shares").delete().eq("token", token);
    if (!error) setShares(shares.filter((s) => s.token !== token));
  }

  async function copy(url: string) {
    await navigator.clipboard.writeText(url).catch(() => {});
    setMsg("Link copied");
    setTimeout(() => setMsg(""), 2000);
  }

  async function startFlow(leadId: string) {
    if (!flowId) return;
    const sb = createClient();
    const { data: flow } = await sb.from("lead_flows").select("id,name,steps").eq("id", flowId).single();
    if (!flow) return;
    const { error } = await sb.from("lead_flow_enrollments").insert({ lead_id: leadId, flow_id: flow.id });
    if (error) { setMsg(error.message); return; }
    const now = Date.now();
    const queue = ((flow as { steps: { channel: string; delay_minutes?: number }[] }).steps ?? []).map((step, i) => ({
      lead_id: leadId, sequence_id: flow.id, step_index: i, channel: step.channel,
      run_at: new Date(now + (Number(step.delay_minutes) || 0) * 60_000).toISOString(),
    }));
    if (queue.length) await sb.from("follow_up_queue").insert(queue);
    setMsg(`Added to “${(flow as { name: string }).name}”`); setFlowOpen(false); setFlowId("");
  }

  const leadId = (submission as unknown as { leadId: string }).leadId;

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <strong className="text-[16px]">{submission.formName}</strong>
          <p className="text-xs text-muted">{submission.subtitle}</p>
        </div>
        <button className="btn h-8 shrink-0 px-3 text-[12px]" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {expanded ? (
        submission.sections.length ? (
          <div className="flex flex-col gap-5">
            {submission.sections.map((sec) => {
              const answered = sec.fields.filter((f) => {
                const v = submission.answers[f.key];
                return v != null && v !== "" && !(Array.isArray(v) && !v.length);
              });
              if (!answered.length) return null;
              return (
                <section key={sec.id}>
                  {sec.heading ? <h4 className="mb-2 border-b border-line pb-1.5 text-[14px] font-bold">{sec.heading}</h4> : null}
                  <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {answered.map((f) => (
                      <div key={f.key} className={f.type === "subform" ? "sm:col-span-2" : ""}>
                        <dt className="text-[11px] uppercase tracking-wide text-muted">{f.label}</dt>
                        <dd className="mt-0.5 text-[14px]">
                          {f.type === "subform" && Array.isArray(submission.answers[f.key]) ? (
                            <SubformTable rows={submission.answers[f.key] as Record<string, unknown>[]} subfields={f.subfields} />
                          ) : (
                            renderAnswer(submission.answers[f.key])
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              );
            })}
          </div>
        ) : (
          <dl className="flex flex-col">
            {Object.entries(submission.answers).map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 border-b border-line/60 py-2 last:border-0">
                <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted">{k.replace(/_/g, " ")}</dt>
                <dd className="text-right text-[14px]">{renderAnswer(v)}</dd>
              </div>
            ))}
          </dl>
        )
      ) : null}

      {/* Per-submission share history */}
      {shares.length ? (
        <div className="flex flex-col gap-2 rounded-xl bg-[#f7f7f7] p-3">
          <strong className="text-[13px]">Shared links ({shares.length})</strong>
          {shares.map((s) => (
            <div key={s.token} className="flex items-center gap-2 text-[13px]">
              <span className="min-w-0 flex-1 truncate font-mono text-[12px]">{s.url}</span>
              <span className="shrink-0 text-xs text-muted">{s.view_count} views · exp {new Date(s.expires_at).toLocaleDateString()}</span>
              <button className="shrink-0 text-[12px] font-medium text-[#0066cc] hover:underline" onClick={() => copy(s.url)}>Copy</button>
              <button className="shrink-0 text-[12px] font-medium text-red-600 hover:underline" onClick={() => revoke(s.token)}>Revoke</button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <button className="btn h-9 px-4 text-[13px]" onClick={() => setEditing(true)}>Edit</button>
        <ShareFormButton
          leadId={leadId}
          attachmentId={attachmentId ?? undefined}
          label="Share"
          onCreated={(url) => setShares([...shares, { token: url.split("/").pop() ?? "", url, expires_at: "", view_count: 0, created_at: new Date().toISOString() }])}
        />
        {flowOpen ? (
          <div className="flex flex-1 gap-2">
            <select className="input h-9 flex-1 py-1 text-[13px]" value={flowId} onChange={(e) => setFlowId(e.target.value)}>
              <option value="">Choose a flow…</option>
              {flows.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <button className="btn-primary h-9 px-4 text-[13px]" disabled={!flowId} onClick={() => startFlow(leadId)}>Start</button>
            <button className="btn h-9 px-3 text-[13px]" onClick={() => { setFlowOpen(false); setFlowId(""); }}>✕</button>
          </div>
        ) : (
          <button className="btn h-9 px-4 text-[13px]" onClick={() => setFlowOpen(true)}>Start flow</button>
        )}
      </div>
      {msg ? <p className="text-sm text-muted" role="status">{msg}</p> : null}

      {editing ? (
        <EditSubmissionModal
          submission={submission}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); setMsg("Answers updated"); }}
        />
      ) : null}
    </div>
  );
}

function EditSubmissionModal({ submission, onClose, onSaved }: {
  submission: FormSubmission; onClose: () => void; onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = {};
    for (const sec of submission.sections) for (const f of sec.fields) {
      if (f.type === "subform" || f.type === "heading") continue;
      const v = submission.answers[f.key];
      d[f.key] = typeof v === "string" ? v : v != null ? JSON.stringify(v) : "";
    }
    // Include any answers not in sections (fallback).
    for (const [k, v] of Object.entries(submission.answers)) {
      if (!(k in d) && typeof v !== "object") d[k] = v != null ? String(v) : "";
    }
    return d;
  });
  const [subformRows, setSubformRows] = useState<Record<string, Record<string, string>[]>>(() => {
    const r: Record<string, Record<string, string>[]> = {};
    for (const sec of submission.sections) for (const f of sec.fields) {
      if (f.type !== "subform" || !f.subfields?.length) continue;
      const v = submission.answers[f.key];
      if (Array.isArray(v)) {
        r[f.key] = v.map((row) => {
          const o: Record<string, string> = {};
          for (const sf of f.subfields!) o[sf.key] = (row as Record<string, unknown>)?.[sf.key] != null ? String((row as Record<string, unknown>)[sf.key]) : "";
          return o;
        });
      } else r[f.key] = [];
    }
    return r;
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setSaving(true); setMsg("");
    const out: Record<string, unknown> = {};
    for (const [k, raw] of Object.entries(draft)) {
      if (!raw.trim()) continue;
      try { out[k] = JSON.parse(raw); }
      catch { out[k] = raw; }
    }
    for (const [k, rows] of Object.entries(subformRows)) {
      const cleaned = rows.map((r) => {
        const o: Record<string, string> = {};
        for (const [sk, sv] of Object.entries(r)) if (sv.trim()) o[sk] = sv.trim();
        return o;
      }).filter((r) => Object.keys(r).length > 0);
      if (cleaned.length) out[k] = cleaned;
    }
    const err = await submission.onSave(out);
    setSaving(false);
    if (err) { setMsg(err); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/50" onClick={onClose}>
      <div className="mx-auto min-h-full w-full max-w-4xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-white px-5 py-4 sm:px-8">
          <div>
            <strong className="text-lg">Edit {submission.formName}</strong>
            <p className="text-sm text-muted">All fields shown — blanks are empty answers.</p>
          </div>
          <button className="btn shrink-0" onClick={onClose}>Close</button>
        </div>
        <div className="flex flex-col gap-6 px-5 py-6 sm:px-8">
          {msg ? <p className="text-sm text-muted" role="status">{msg}</p> : null}
          {submission.sections.length ? submission.sections.map((sec) => (
            <section key={sec.id}>
              {sec.heading ? <h4 className="mb-3 border-b border-line pb-2 text-[16px] font-bold">{sec.heading}</h4> : null}
              <div className="grid gap-4 sm:grid-cols-2">
                {sec.fields.filter((f) => f.type !== "heading").map((f) => {
                  if (f.type === "subform" && f.subfields?.length) {
                    return (
                      <div key={f.key} className="sm:col-span-2">
                        <SubformEditor
                          field={f}
                          rows={subformRows[f.key] ?? []}
                          onChange={(rows) => setSubformRows({ ...subformRows, [f.key]: rows })}
                        />
                      </div>
                    );
                  }
                  return (
                    <label key={f.key} className={`label ${f.type === "textarea" ? "sm:col-span-2" : ""}`}>{f.label}
                      {f.type === "textarea" ? (
                        <textarea className="textarea" rows={3} value={draft[f.key] ?? ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
                      ) : f.type === "dropdown" && f.options?.length ? (
                        <select className="input" value={draft[f.key] ?? ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}>
                          <option value="">Select…</option>
                          {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input className="input" value={draft[f.key] ?? ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
                      )}
                    </label>
                  );
                })}
              </div>
            </section>
          )) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {Object.entries(draft).map(([k, v]) => (
                <label key={k} className="label">{k.replace(/_/g, " ")}
                  <input className="input" value={v} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
                </label>
              ))}
            </div>
          )}
          <div className="flex gap-2 border-t border-line pt-4">
            <button className="btn-primary" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save answers"}</button>
            <button className="btn" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubformEditor({ field, rows, onChange }: {
  field: FormField; rows: Record<string, string>[]; onChange: (rows: Record<string, string>[]) => void;
}) {
  function setRow(i: number, key: string, val: string) {
    onChange(rows.map((r, j) => (j === i ? { ...r, [key]: val } : r)));
  }
  function addRow() {
    const blank: Record<string, string> = {};
    for (const sf of field.subfields ?? []) blank[sf.key] = "";
    onChange([...rows, blank]);
  }
  return (
    <div className="rounded-xl bg-[#f7f7f7] p-4">
      <div className="mb-3 flex items-center justify-between">
        <strong className="text-[14px]">{field.label}</strong>
        <span className="text-xs text-muted">{rows.length} {rows.length === 1 ? "entry" : "entries"}</span>
      </div>
      <div className="flex flex-col gap-3">
        {rows.map((row, i) => (
          <div key={i} className="rounded-lg bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12px] font-medium text-muted">Entry {i + 1}</span>
              <button className="text-[12px] text-red-600 hover:underline" onClick={() => onChange(rows.filter((_, j) => j !== i))}>Remove</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(field.subfields ?? []).map((sf) => (
                <label key={sf.key} className="label text-[12px]">{sf.label}
                  <input className="input h-9 text-[13px]" value={row[sf.key] ?? ""} onChange={(e) => setRow(i, sf.key, e.target.value)} />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button className="btn mt-3 h-9 text-[13px]" onClick={addRow}>+ {field.repeat_label ?? "Add entry"}</button>
    </div>
  );
}
