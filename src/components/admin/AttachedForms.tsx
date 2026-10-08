"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ShareFormButton } from "./ShareFormButton";

type Attachment = {
  id: string;
  form_id: string;
  form_name: string;
  form_key: string;
  answers: Record<string, unknown>;
  filled_by: "staff" | "lead";
  created_at: string;
};

type Flow = { id: string; name: string; steps: { channel: string; delay_minutes?: number }[] };
type FormField = { key: string; label: string; type: string; options?: string[]; subfields?: FormField[]; repeat_label?: string };
type FormSection = { id: string; heading?: string; fields: FormField[] };

function renderAnswer(v: unknown): string {
  if (v == null || v === "") return "—";
  if (Array.isArray(v)) {
    if (v.length && typeof v[0] === "object") {
      return v.map((row) =>
        Object.entries(row as Record<string, unknown>)
          .map(([k, val]) => `${k.replace(/_/g, " ")}: ${String(val)}`)
          .join(" · ")
      ).join(" | ");
    }
    return v.map(String).join(", ");
  }
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

/** Attached forms on a lead: structured by form sections, with edit/share/flow actions. */
export function AttachedForms({ leadId }: { leadId: string }) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [forms, setForms] = useState<Record<string, FormSection[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<Attachment | null>(null);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [flowFor, setFlowFor] = useState<string | null>(null);
  const [flowId, setFlowId] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const sb = createClient();
    sb.from("lead_form_attachments").select("*").eq("lead_id", leadId).order("created_at", { ascending: false })
      .then(async ({ data }) => {
        const atts = (data ?? []) as Attachment[];
        setItems(atts);
        // Fetch form definitions for structured display.
        const formIds = [...new Set(atts.map((a) => a.form_id))];
        const defs: Record<string, FormSection[]> = {};
        for (const fid of formIds) {
          const { data: f } = await sb.from("forms").select("sections").eq("id", fid).maybeSingle();
          if (f) defs[fid] = ((f as { sections: FormSection[] }).sections ?? []) as FormSection[];
        }
        setForms(defs);
      });
    sb.from("lead_flows").select("id,name,steps").eq("is_active", true).order("name")
      .then(({ data }) => setFlows((data ?? []) as Flow[]));
  }, [leadId]);

  async function startFlow() {
    if (!flowFor || !flowId) return;
    const flow = flows.find((f) => f.id === flowId);
    if (!flow) return;
    const sb = createClient();
    const { error } = await sb.from("lead_flow_enrollments").insert({ lead_id: leadId, flow_id: flow.id });
    if (error) { setMsg(error.message); return; }
    const now = Date.now();
    const queue = flow.steps.map((step, i) => ({
      lead_id: leadId, sequence_id: flow.id, step_index: i, channel: step.channel,
      run_at: new Date(now + (Number(step.delay_minutes) || 0) * 60_000).toISOString(),
    }));
    if (queue.length) await sb.from("follow_up_queue").insert(queue);
    setMsg(`Added to “${flow.name}”`); setFlowFor(null); setFlowId("");
  }

  if (!items.length) return null;

  return (
    <div className="flex flex-col gap-4">
      {msg ? <p className="text-sm text-muted" role="status">{msg}</p> : null}
      {items.map((a) => {
        const sections = forms[a.form_id] ?? [];
        const isOpen = expanded === a.id;
        return (
          <div key={a.id} className="card flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <strong className="text-[16px]">{a.form_name}</strong>
                <p className="text-xs text-muted">
                  {a.filled_by === "staff" ? "Filled by staff" : "Filled by lead"} · {new Date(a.created_at).toLocaleDateString()}
                </p>
              </div>
              <button className="btn h-8 shrink-0 px-3 text-[12px]" onClick={() => setExpanded(isOpen ? null : a.id)}>
                {isOpen ? "Collapse" : "Expand"}
              </button>
            </div>

            {isOpen ? (
              sections.length ? (
                <div className="flex flex-col gap-5">
                  {sections.map((sec) => {
                    const answered = sec.fields.filter((f) => {
                      const v = a.answers[f.key];
                      return v != null && v !== "" && !(Array.isArray(v) && !v.length);
                    });
                    if (!answered.length) return null;
                    return (
                      <section key={sec.id}>
                        {sec.heading ? <h4 className="mb-2 border-b border-line pb-1.5 text-[14px] font-bold">{sec.heading}</h4> : null}
                        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                          {answered.map((f) => (
                            <div key={f.key}>
                              <dt className="text-[11px] uppercase tracking-wide text-muted">{f.label}</dt>
                              <dd className="mt-0.5 text-[14px]">{renderAnswer(a.answers[f.key])}</dd>
                            </div>
                          ))}
                        </dl>
                      </section>
                    );
                  })}
                </div>
              ) : (
                <dl className="flex flex-col">
                  {Object.entries(a.answers).map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-4 border-b border-line/60 py-2 last:border-0">
                      <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted">{k.replace(/_/g, " ")}</dt>
                      <dd className="text-right text-[14px]">{renderAnswer(v)}</dd>
                    </div>
                  ))}
                </dl>
              )
            ) : null}

            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <button className="btn h-9 px-4 text-[13px]" onClick={() => setEditing(a)}>Edit</button>
              <ShareFormButton leadId={leadId} attachmentId={a.id} label="Share" />
              {flowFor === a.id ? (
                <div className="flex flex-1 gap-2">
                  <select className="input h-9 flex-1 py-1 text-[13px]" value={flowId} onChange={(e) => setFlowId(e.target.value)}>
                    <option value="">Choose a flow…</option>
                    {flows.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  <button className="btn-primary h-9 px-4 text-[13px]" disabled={!flowId} onClick={startFlow}>Start</button>
                  <button className="btn h-9 px-3 text-[13px]" onClick={() => { setFlowFor(null); setFlowId(""); }}>Cancel</button>
                </div>
              ) : (
                <button className="btn h-9 px-4 text-[13px]" onClick={() => setFlowFor(a.id)}>Start flow</button>
              )}
            </div>
          </div>
        );
      })}
      {editing ? (
        <EditAttachmentModal
          attachment={editing}
          sections={forms[editing.form_id] ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setMsg("Answers updated"); }}
        />
      ) : null}
    </div>
  );
}

function EditAttachmentModal({ attachment, sections, onClose, onSaved }: {
  attachment: Attachment; sections: FormSection[]; onClose: () => void; onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = {};
    for (const sec of sections) for (const f of sec.fields) {
      if (f.type === "subform") continue;
      const v = attachment.answers[f.key];
      d[f.key] = typeof v === "string" ? v : v != null ? JSON.stringify(v) : "";
    }
    return d;
  });
  const [subformRows, setSubformRows] = useState<Record<string, Record<string, string>[]>>(() => {
    const r: Record<string, Record<string, string>[]> = {};
    for (const sec of sections) for (const f of sec.fields) {
      if (f.type !== "subform" || !f.subfields?.length) continue;
      const v = attachment.answers[f.key];
      if (Array.isArray(v)) {
        r[f.key] = v.map((row) => {
          const o: Record<string, string> = {};
          for (const sf of f.subfields!) o[sf.key] = row?.[sf.key] != null ? String(row[sf.key]) : "";
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
    const { error } = await createClient().from("lead_form_attachments").update({ answers: out }).eq("id", attachment.id);
    setSaving(false);
    if (error) { setMsg(error.message); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/50" onClick={onClose}>
      <div className="mx-auto min-h-full w-full max-w-4xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-white px-5 py-4 sm:px-8">
          <div>
            <strong className="text-lg">Edit {attachment.form_name}</strong>
            <p className="text-sm text-muted">All fields shown — blanks are empty answers.</p>
          </div>
          <button className="btn shrink-0" onClick={onClose}>Close</button>
        </div>
        <div className="flex flex-col gap-6 px-5 py-6 sm:px-8">
          {msg ? <p className="text-sm text-muted" role="status">{msg}</p> : null}
          {sections.map((sec) => (
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
                  const isLong = f.type === "textarea";
                  return (
                    <label key={f.key} className={`label ${isLong ? "sm:col-span-2" : ""}`}>{f.label}
                      {f.type === "textarea" ? (
                        <textarea className="textarea" rows={3} value={draft[f.key] ?? ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
                      ) : f.type === "dropdown" && f.options?.length ? (
                        <select className="input" value={draft[f.key] ?? ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}>
                          <option value="">Select…</option>
                          {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input className="input" type={f.type === "date" ? "date" : f.type === "email" ? "email" : f.type === "tel" ? "tel" : "text"} value={draft[f.key] ?? ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
                      )}
                    </label>
                  );
                })}
              </div>
            </section>
          ))}
          <div className="flex gap-2 border-t border-line pt-4">
            <button className="btn-primary" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save answers"}</button>
            <button className="btn" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Editor for a repeatable subform: rows with add/remove, each row has the subfields. */
function SubformEditor({ field, rows, onChange }: {
  field: FormField; rows: Record<string, string>[]; onChange: (rows: Record<string, string>[]) => void;
}) {
  function setRow(i: number, key: string, val: string) {
    const next = rows.map((r, j) => (j === i ? { ...r, [key]: val } : r));
    onChange(next);
  }
  function addRow() {
    const blank: Record<string, string> = {};
    for (const sf of field.subfields ?? []) blank[sf.key] = "";
    onChange([...rows, blank]);
  }
  function removeRow(i: number) {
    onChange(rows.filter((_, j) => j !== i));
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
              <button className="text-[12px] text-red-600 hover:underline" onClick={() => removeRow(i)}>Remove</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(field.subfields ?? []).map((sf) => (
                <label key={sf.key} className="label text-[12px]">{sf.label}
                  {sf.type === "dropdown" && sf.options?.length ? (
                    <select className="input h-9 text-[13px]" value={row[sf.key] ?? ""} onChange={(e) => setRow(i, sf.key, e.target.value)}>
                      <option value="">Select…</option>
                      {sf.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input className="input h-9 text-[13px]" value={row[sf.key] ?? ""} onChange={(e) => setRow(i, sf.key, e.target.value)} />
                  )}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button className="btn mt-3 h-9 text-[13px]" onClick={addRow}>
        + {field.repeat_label ?? "Add entry"}
      </button>
    </div>
  );
}
