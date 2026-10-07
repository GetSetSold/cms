"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Lead, LeadFlow, LeadFlowEnrollment } from "@/lib/types";
import { LEAD_FLOW_CATEGORIES, LEAD_STATUSES } from "@/lib/types";
import { AttachedForms } from "./AttachedForms";
import { AttachFormButton } from "./AttachFormButton";
import { ShareApplicationButton } from "./ShareApplicationButton";

type Activity = { id: string; type: string; body: string | null; meta: any; created_at: string };
type QueueItem = { id: string; channel: string; run_at: string; sequence_id: string };

const DOT: Record<string, string> = {
  sms_out: "bg-primary", email_out: "bg-primary", sms_in: "bg-accent", note: "bg-ink", status_change: "bg-[#8A8E97]", system: "bg-line",
};
const LABEL: Record<string, string> = {
  sms_out: "SMS sent", email_out: "Email sent", sms_in: "SMS received", note: "Note", status_change: "Status changed", system: "System",
};
const catLabel = (c: string) => LEAD_FLOW_CATEGORIES.find((x) => x.value === c)?.label ?? c;

/** Turns a saved form answer into readable text. Subform answers arrive as an array of objects
 *  (one per entry) — shown as a small table of its own rather than a raw JSON dump.
 *  Arrays of plain strings (e.g. a renovations checklist) render as a clean
 *  comma list — never character-split via Object.entries. */
function FieldValue({ v }: { v: unknown }) {
  if (Array.isArray(v)) {
    if (!v.length) return <span className="text-muted">—</span>;
    if (v.every((x) => x == null || typeof x !== "object")) {
      return <span>{v.map((x) => String(x ?? "").trim()).filter(Boolean).join(", ") || "—"}</span>;
    }
    // Stacked, not a wide table — a subform entry with several fields would otherwise force
    // horizontal scrolling, especially on the narrow admin layout or a phone.
    return (
      <div className="flex flex-col gap-3">
        {v.map((row, i) => (
          <div key={i} className="rounded-lg border border-line p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Entry {i + 1}</div>
            <dl className="flex flex-col gap-2">
              {Object.entries(row ?? {}).map(([k, val]) => (
                <div key={k} className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted">{k.replace(/_/g, " ")}</dt>
                  <dd className="text-[14px]"><FieldValue v={val} /></dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    );
  }
  if (v && typeof v === "object") return <pre className="whitespace-pre-wrap text-[13px] text-muted">{JSON.stringify(v, null, 2)}</pre>;
  return <span>{String(v ?? "") || "—"}</span>;
}

/** Compact one-line preview of a field value for the summary list. */
function fieldPreview(v: unknown): string {
  if (Array.isArray(v)) {
    if (!v.length) return "—";
    if (v.every((x) => x == null || typeof x !== "object"))
      return v.map((x) => String(x ?? "").trim()).filter(Boolean).join(", ") || "—";
    return `${v.length} ${v.length === 1 ? "entry" : "entries"}`;
  }
  if (v && typeof v === "object") return "View details";
  const s = String(v ?? "").trim();
  return s.length > 60 ? `${s.slice(0, 60)}…` : s || "—";
}

function SubmissionModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const entries = Object.entries(lead.custom_fields ?? {});
  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0 bg-black/70" onClick={onClose} aria-hidden />
      <div className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line p-5 sm:p-6">
          <div>
            <strong className="text-[16px]">Form submission</strong>
            <p className="text-[13px] text-muted">
              All answers from the “{lead.form_key ?? "unknown"}” form, exactly as submitted.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close submission details"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-soft text-[16px] text-ink hover:bg-line"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto p-5 sm:p-6">
          {entries.length ? (
            <dl className="flex flex-col gap-4">
              {entries.map(([key, v]) => (
                <div key={key} className="flex flex-col gap-1 border-b border-line/60 pb-4 last:border-0 last:pb-0">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted">{key.replace(/_/g, " ")}</dt>
                  <dd className="text-[15px]"><FieldValue v={v} /></dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-[13px] text-muted">This form had no additional questions beyond name, email and phone.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function FormSubmissionPanel({ lead }: { lead: Lead }) {
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const entries = Object.entries(lead.custom_fields ?? {});
  const preview = entries.slice(0, 5);

  function startEdit() {
    const d: Record<string, string> = {};
    for (const [k, v] of entries) {
      d[k] = typeof v === "string" ? v : JSON.stringify(v ?? "");
    }
    setDraft(d); setEditing(true); setMsg("");
  }

  async function saveAnswers() {
    setSaving(true); setMsg("");
    const out: Record<string, unknown> = {};
    for (const [k, raw] of Object.entries(draft)) {
      const orig = (lead.custom_fields ?? {})[k];
      if (typeof orig === "string" || orig == null) {
        out[k] = raw;
      } else {
        try { out[k] = JSON.parse(raw); }
        catch { out[k] = raw; }
      }
    }
    const { error } = await createClient().from("leads").update({ custom_fields: out }).eq("id", lead.id);
    setSaving(false);
    if (error) { setMsg(error.message); return; }
    setEditing(false); setMsg("Answers updated");
  }

  return (
    <div className="flex flex-col gap-4">
    <div className="card flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <strong>Form submission</strong>
          <p className="text-[13px] text-muted">Answers from the “{lead.form_key ?? "unknown"}” form.</p>
        </div>
        <div className="flex gap-2">
          {entries.length > 0 && !editing ? (
            <button onClick={() => setEditing(true)} className="btn h-9 shrink-0 px-4 text-[13px]">
              Edit
            </button>
          ) : null}
          {entries.length > 0 && !editing ? (
            <button onClick={() => setShowAll(true)} className="btn h-9 shrink-0 px-4 text-[13px]">
              View
            </button>
          ) : null}
        </div>
      </div>
      {msg ? <p className="text-sm text-muted" role="status">{msg}</p> : null}
      {editing ? (
        <div className="flex flex-col gap-3">
          {entries.map(([key]) => {
            const orig = (lead.custom_fields ?? {})[key];
            const isComplex = orig != null && typeof orig !== "string";
            return (
              <label key={key} className="label">{key.replace(/_/g, " ")}
                {isComplex ? (
                  <textarea className="textarea font-mono text-xs" rows={3} value={draft[key] ?? ""} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />
                ) : (
                  <input className="input" value={draft[key] ?? ""} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />
                )}
              </label>
            );
          })}
          <div className="flex gap-2">
            <button className="btn-primary" disabled={saving} onClick={saveAnswers}>{saving ? "Saving…" : "Save answers"}</button>
            <button className="btn" onClick={() => { setEditing(false); setMsg(""); }}>Cancel</button>
          </div>
        </div>
      ) : entries.length ? (
        <dl className="flex flex-col">
          {preview.map(([key, v]) => (
            <div key={key} className="flex items-baseline justify-between gap-4 border-b border-line/60 py-2 last:border-0">
              <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted">{key.replace(/_/g, " ")}</dt>
              <dd className="truncate text-right text-[14px]">{fieldPreview(v)}</dd>
            </div>
          ))}
          {entries.length > preview.length ? (
            <p className="pt-2 text-[12px] text-muted">+ {entries.length - preview.length} more — click View for all.</p>
          ) : null}
        </dl>
      ) : (
        <p className="text-[13px] text-muted">This form had no additional questions beyond name, email and phone.</p>
      )}
      {showAll ? <SubmissionModal lead={lead} onClose={() => setShowAll(false)} /> : null}
    </div>
    <AttachedForms leadId={lead.id} />
    </div>
  );
}

function FlowsPanel({ leadId, enrollments, available }: { leadId: string; enrollments: LeadFlowEnrollment[]; available: LeadFlow[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [pending, setPending] = useState("");
  const [msg, setMsg] = useState("");
  const enrolledIds = new Set(enrollments.map((e) => e.flow_id));
  const pickable = available.filter((f) => !enrolledIds.has(f.id));

  async function addToFlow() {
    if (!pending) return;
    const flow = available.find((f) => f.id === pending);
    if (!flow) return;
    const { error } = await supabase.from("lead_flow_enrollments").insert({ lead_id: leadId, flow_id: flow.id });
    if (error) { setMsg(error.message); return; }
    // Seed the same queue the automatic enrollment on submission uses, so sending works identically
    // whether a lead was matched by form or added by a staff member.
    const now = Date.now();
    const queue = flow.steps.map((step, i) => ({
      lead_id: leadId, sequence_id: flow.id, step_index: i, channel: step.channel,
      run_at: new Date(now + (Number(step.delay_minutes) || 0) * 60_000).toISOString(),
    }));
    if (queue.length) await supabase.from("follow_up_queue").insert(queue);
    setMsg(`Added to “${flow.name}”`); setPending(""); router.refresh();
  }
  async function stop(enrollmentId: string, flowId: string) {
    await supabase.from("lead_flow_enrollments").update({ status: "stopped" }).eq("id", enrollmentId);
    await supabase.from("follow_up_queue").update({ status: "skipped" }).eq("lead_id", leadId).eq("sequence_id", flowId).eq("status", "pending");
    setMsg("Removed from flow"); router.refresh();
  }

  return (
    <div className="card flex flex-col gap-4">
      <strong>Flows &amp; automations</strong>
      {enrollments.length ? (
        <ul className="flex flex-col gap-2.5">
          {enrollments.map((e) => (
            <li key={e.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
              <span className={`h-2 w-2 shrink-0 rounded-full ${e.status === "active" ? "bg-primary" : "bg-line"}`} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{e.flow?.name ?? "Flow"}</div>
                <div className="text-xs text-muted">{catLabel(e.flow?.category ?? "general")} · {e.status}{e.enrolled_by ? "" : " · auto-enrolled"}</div>
              </div>
              {e.status === "active" ? <button className="shrink-0 text-sm text-red-700" onClick={() => stop(e.id, e.flow_id)}>Remove</button> : null}
            </li>
          ))}
        </ul>
      ) : <p className="text-[13px] text-muted">Not in any flow yet.</p>}
      {pickable.length ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <select className="input h-9 flex-1" value={pending} onChange={(e) => setPending(e.target.value)}>
            <option value="">Add to a flow…</option>
            {pickable.map((f) => <option key={f.id} value={f.id}>{f.name} — {catLabel(f.category)}</option>)}
          </select>
          <button className="btn" disabled={!pending} onClick={addToFlow}>Add</button>
        </div>
      ) : null}
      {msg ? <p className="text-sm text-muted" role="status">{msg}</p> : null}
    </div>
  );
}

function ActivityPanel({ leadId, activities, queue }: { leadId: string; activities: Activity[]; queue: QueueItem[] }) {
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");

  async function addNote() {
    if (!note.trim()) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("lead_activities").insert({ lead_id: leadId, type: "note", body: note.trim(), created_by: user?.id });
    if (!error) setNote("");
    setMsg(error ? error.message : "Note added");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-3">
        <strong>Add a note</strong>
        <textarea className="textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note about this lead…" />
        <button className="btn-primary w-fit" disabled={!note.trim()} onClick={addNote}>Add note</button>
        {msg ? <p className="text-sm text-muted" role="status">{msg}</p> : null}
      </div>
      <div className="card flex flex-col gap-4">
        <strong>Activity</strong>
      {queue.map((q) => (
        <div key={q.id} className="flex gap-3">
          <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-dashed border-[#B5AFA2]" />
          <div><div className="font-medium text-muted">Scheduled {q.channel}</div><div className="text-xs text-muted">{new Date(q.run_at).toLocaleString()}</div></div>
        </div>
      ))}
      {activities.map((a) => (
        <div key={a.id} className="flex gap-3">
          <div className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${DOT[a.type] ?? "bg-line"}`} />
          <div>
            <div className="font-medium">{LABEL[a.type] ?? a.type}{a.meta?.automation ? " · automation" : ""}</div>
            {a.body ? <div className="whitespace-pre-line text-[13px] text-muted">{a.body}</div> : null}
            <div className="text-xs text-muted">{new Date(a.created_at).toLocaleString()}</div>
          </div>
        </div>
      ))}
      {!activities.length && !queue.length ? <p className="text-[13px] text-muted">Nothing yet.</p> : null}
      </div>
    </div>
  );
}

function OverviewPanel({ lead, activities }: { lead: Lead; activities: Activity[] }) {
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unnamed lead";
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(lead.first_name ?? "");
  const [lastName, setLastName] = useState(lead.last_name ?? "");
  const [email, setEmail] = useState(lead.email ?? "");
  const [phone, setPhone] = useState(lead.phone ?? "");
  const [status, setStatus] = useState(lead.status);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setSaving(true); setMsg("");
    const { error } = await createClient().from("leads").update({
      first_name: firstName.trim() || null,
      last_name: lastName.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      status,
    }).eq("id", lead.id);
    setSaving(false);
    if (error) { setMsg(error.message); return; }
    setEditing(false); setMsg("Saved");
  }

  async function deleteLead() {
    const label = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || lead.email || lead.phone || "this lead";
    if (!confirm(`Delete ${label}? This removes the lead and its history from the database. This cannot be undone.`)) return;
    const supabase = createClient();
    await supabase.from("lead_activities").delete().eq("lead_id", lead.id);
    await supabase.from("follow_up_queue").delete().eq("lead_id", lead.id);
    await supabase.from("lead_flow_enrollments").delete().eq("lead_id", lead.id);
    await supabase.from("lead_form_attachments").delete().eq("lead_id", lead.id);
    const { error } = await supabase.from("leads").delete().eq("id", lead.id);
    if (error) { setMsg(error.message); return; }
    window.location.href = "/admin/leads";
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="card flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold">{name}</h1>
          {!editing ? (
            <button className="btn h-9 shrink-0 px-4 text-[13px]" onClick={() => setEditing(true)}>Edit</button>
          ) : null}
        </div>
        {msg ? <p className="text-sm text-muted" role="status">{msg}</p> : null}
        {editing ? (
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="label">First name<input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></label>
              <label className="label">Last name<input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} /></label>
              <label className="label">Email<input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
              <label className="label">Phone<input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
              <label className="label">Status
                <select className="input capitalize" value={status} onChange={(e) => setStatus(e.target.value as Lead["status"])}>
                  {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
            <div className="flex gap-2">
              <button className="btn-primary" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save"}</button>
              <button className="btn" onClick={() => { setEditing(false); setMsg(""); }}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <dl className="grid gap-4 text-[13px] sm:grid-cols-2">
              {[
                ["Phone", lead.phone && <a href={`tel:${lead.phone}`}>{lead.phone}</a>],
                ["Email", lead.email && <a href={`mailto:${lead.email}`}>{lead.email}</a>],
                ["Status", <span className="capitalize">{lead.status}</span>],
                ["Company", lead.company], ["Service", lead.service], ["Form", lead.form_key], ["Page", lead.source_path],
                ["SMS consent", lead.sms_opted_out ? "Opted out (STOP)" : lead.sms_opt_in ? "Opted in" : "No"],
                ["Received", new Date(lead.created_at).toLocaleString()],
                ["Source", Object.entries((lead.utm as Record<string, unknown>) ?? {}).map(([k, v]) => `${k}=${v}`).join(" · ") || "Direct"],
              ].map(([k, v]) => (
                <div key={k as string}><dt className="text-muted">{k}</dt><dd className="text-[15px]">{v || "—"}</dd></div>
              ))}
            </dl>
            {lead.message ? <div className="rounded-lg bg-ground p-4 text-[15px] leading-relaxed">{lead.message}</div> : null}
          </>
        )}
      </div>
      <div className="card flex flex-col gap-3">
        <strong>Recent activity</strong>
        {activities.slice(0, 3).map((a) => (
          <div key={a.id} className="flex gap-3">
            <div className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${DOT[a.type] ?? "bg-line"}`} />
            <div>
              <div className="font-medium">{LABEL[a.type] ?? a.type}</div>
              <div className="text-xs text-muted">{new Date(a.created_at).toLocaleString()}</div>
            </div>
          </div>
        ))}
        {!activities.length ? <p className="text-[13px] text-muted">Nothing yet.</p> : null}
      </div>
      <div className="card">
        <button className="btn w-full border-red-200 text-red-600 hover:bg-red-50" onClick={deleteLead}>
          Delete lead
        </button>
      </div>
    </div>
  );
}

function MatchesPanel() {
  return (
    <div className="card flex flex-col items-center gap-3 py-12 text-center">
      <h2 className="text-lg font-semibold">Complete the criteria to start matching</h2>
      <p className="max-w-md text-[13px] text-muted">Once the target area, property type and budget are confirmed, this tab will pull matching rental listings, resale homes and pre-construction projects for review.</p>
    </div>
  );
}

function CommunicationPanel({ lead }: { lead: Lead }) {
  const supabase = useMemo(() => createClient(), []);
  const [sms, setSms] = useState("");
  const [msg, setMsg] = useState("");
  const canSms = !!lead.phone && lead.sms_opt_in && !lead.sms_opted_out;
  const leadName = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "this lead";

  async function sendSms() {
    const { data, error } = await supabase.functions.invoke("send-sms", { body: { lead_id: lead.id, body: sms } });
    if (error || (data as { error?: string })?.error) {
      setMsg((data as { error?: string })?.error ?? error?.message ?? "Failed");
      return;
    }
    setSms(""); setMsg("SMS sent");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-3">
        <strong>Send SMS</strong>
        {canSms ? (
          <>
            <textarea className="textarea" rows={3} maxLength={1200} value={sms} onChange={(e) => setSms(e.target.value)} placeholder={`Message ${leadName}…`} />
            <button className="btn-primary w-fit" disabled={!sms.trim()} onClick={sendSms}>Send SMS</button>
          </>
        ) : (
          <p className="text-[13px] text-muted">{lead.sms_opted_out ? "This lead replied STOP." : !lead.phone ? "No phone number on file." : "No SMS consent — call or email instead."}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {lead.phone ? <a className="btn" href={`tel:${lead.phone}`}>Call {lead.phone}</a> : null}
          {lead.email ? <a className="btn" href={`mailto:${lead.email}`}>Email {lead.email}</a> : null}
        </div>
        {msg ? <p className="text-sm text-muted" role="status">{msg}</p> : null}
      </div>
      <div className="card flex flex-col gap-3">
        <strong>Send a form</strong>
        <p className="text-[13px] text-muted">Pick a form and send {leadName} a link to fill it — answers attach to this lead.</p>
        <AttachFormButton leadId={lead.id} leadName={leadName} sendOnly />
      </div>
      {lead.form_key === "rental_application" ? (
        <ShareApplicationButton leadId={lead.id} />
      ) : null}
    </div>
  );
}

const TABS = ["overview", "form", "communication", "activity", "flows", "matches"] as const;
type Tab = (typeof TABS)[number];

export function LeadTabs({ lead, activities, queue, enrollments, availableFlows }: {
  lead: Lead; activities: Activity[]; queue: QueueItem[]; enrollments: LeadFlowEnrollment[]; availableFlows: LeadFlow[];
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const counts: Record<Tab, number | null> = {
    overview: null, form: Object.keys(lead.custom_fields ?? {}).length || null,
    communication: null,
    activity: activities.length || null, flows: enrollments.filter((e) => e.status === "active").length || null, matches: null,
  };
  const titles: Record<Tab, string> = { overview: "Overview", form: "Forms", communication: "Communication", activity: "Activity", flows: "Flows & automations", matches: "Matches" };

  return (
    <div className="flex flex-col gap-5">
      <nav role="tablist" aria-label="Lead record sections" className="flex flex-wrap gap-1 rounded-xl bg-soft/70 p-1">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium ${tab === t ? "bg-white shadow-sm" : "text-muted"}`}>
            {titles[t]}
            {counts[t] ? <span className="rounded-full bg-ground px-1.5 text-xs text-muted">{counts[t]}</span> : null}
          </button>
        ))}
      </nav>
      {tab === "overview" ? <OverviewPanel lead={lead} activities={activities} /> : null}
      {tab === "form" ? <FormSubmissionPanel lead={lead} /> : null}
      {tab === "communication" ? <CommunicationPanel lead={lead} /> : null}
      {tab === "activity" ? <ActivityPanel leadId={lead.id} activities={activities} queue={queue} /> : null}
      {tab === "flows" ? <FlowsPanel leadId={lead.id} enrollments={enrollments} available={availableFlows} /> : null}
      {tab === "matches" ? <MatchesPanel /> : null}
    </div>
  );
}
