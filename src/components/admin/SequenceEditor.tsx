"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LEAD_FLOW_CATEGORIES, type LeadFlowCategory } from "@/lib/types";
import { Modal } from "@/components/admin/Modal";

type Step = { delay_minutes: number; channel: "sms" | "email"; subject?: string; template: string; layout?: "plain" | "branded" };
type Seq = { id?: string; name: string; description: string | null; category: LeadFlowCategory; trigger: string; form_key: string | null; is_active: boolean; steps: Step[] };

const DELAYS = [
  [0, "Immediately"], [60, "After 1 hour"], [240, "After 4 hours"], [1440, "After 1 day"],
  [2880, "After 2 days"], [4320, "After 3 days"], [10080, "After 1 week"],
] as const;

const BLANK: Seq = { name: "", description: null, category: "general", trigger: "lead_created", form_key: null, is_active: false, steps: [] };

// Only tokens that actually resolve today (process-follow-ups fills these from the lead record and
// site settings) — no "property" or "booking link" yet, since nothing populates them until the
// matching-listings step type exists.
const FIELD_TOKENS = ["first_name", "last_name", "email", "phone", "service", "site_name", "property_address", "agent_name", "booking_link", "match_count"];
// These four aren't populated by the automation yet — matching listings, a per-flow booking link and
// an assigned agent name are follow-on work — but the token is safe to use now: it just renders blank
// until then, and the flow's message won't need editing again once it is.
const PENDING_TOKENS = new Set(["property_address", "agent_name", "booking_link", "match_count"]);

const SAMPLE: Record<string, string> = {
  first_name: "Maya", last_name: "Thompson", email: "maya@example.com", phone: "555-0100", service: "Rental",
  site_name: "GetSetSold", property_address: "142 Elm Street", agent_name: "Rohit Sharma", booking_link: "getsetsold.ca/book/rohit", match_count: "6",
};
const fill = (tpl: string) => tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => SAMPLE[k] ?? "");

/** An SMS bubble or a branded-email card previewing exactly what the lead will see, using sample
 *  values for the {{tokens}} — so a flow can be checked for tone and layout before it ever sends. */
function StepPreview({ s }: { s: Step }) {
  if (s.channel === "sms") {
    const text = fill(s.template) + (s.template.trim() ? "\nReply STOP to opt out." : "");
    return (
      <div className="w-full max-w-[240px] shrink-0 self-start rounded-2xl bg-[#0B0B0F] p-3">
        <div className="rounded-xl bg-white p-3">
          <div className="mb-2 text-[10px] font-medium text-muted">Today · Preview</div>
          {text.trim() ? (
            <div className="rounded-2xl rounded-bl-sm bg-[#E9E9EB] px-3 py-2 text-[13px] leading-snug text-ink">{text}</div>
          ) : <p className="text-[13px] text-muted">Start typing to preview the message…</p>}
        </div>
      </div>
    );
  }
  const subject = fill(s.subject ?? "");
  const body = fill(s.template);
  if ((s.layout ?? "plain") !== "branded") {
    return (
      <div className="w-full max-w-[280px] shrink-0 self-start rounded-xl border border-line bg-white p-4 text-[13px]">
        <div className="mb-2 border-b border-line pb-2"><span className="text-xs text-muted">Subject: </span><strong>{subject || "(no subject yet)"}</strong></div>
        <p className="whitespace-pre-line text-muted">{body || "Start typing to preview the message…"}</p>
      </div>
    );
  }
  return (
    <div className="w-full max-w-[280px] shrink-0 self-start overflow-hidden rounded-xl border border-line bg-white text-[13px]">
      <div className="bg-[#14142B] px-4 py-3 text-white">
        <div className="text-sm font-bold">{SAMPLE.site_name}</div>
      </div>
      <div className="p-4">
        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[#2563eb]">Personal real estate guidance</div>
        <div className="mb-2 font-semibold text-ink">{subject || "(no subject yet)"}</div>
        <p className="whitespace-pre-line text-muted">{body || "Start typing to preview the message…"}</p>
        <span className="mt-3 inline-block rounded-full bg-[#2563eb] px-4 py-1.5 text-xs font-semibold text-white">View your next step</span>
      </div>
    </div>
  );
}

export function SequenceEditor({ initial }: { initial: Seq | null }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [seq, setSeq] = useState<Seq>(initial ?? BLANK);
  // Every saved flow used to render fully expanded, all at once — the exact "doesn't fit" problem
  // the modal is meant to fix. Both a saved flow and a fresh one now start collapsed.
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");

  const setStep = (i: number, patch: Partial<Step>) => setSeq({ ...seq, steps: seq.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  async function save() {
    const row = { name: seq.name || "Untitled", description: seq.description || null, category: seq.category, trigger: seq.trigger, form_key: seq.form_key || null, is_active: seq.is_active, steps: seq.steps };
    const { error } = seq.id
      ? await supabase.from("follow_up_sequences").update(row).eq("id", seq.id)
      : await supabase.from("follow_up_sequences").insert(row);
    setMsg(error ? error.message : "Saved");
    if (!error && !seq.id) { setSeq(BLANK); setOpen(false); }
    router.refresh();
  }
  async function remove() {
    if (!seq.id || !confirm("Delete this flow? Leads currently enrolled will stop receiving its messages.")) return;
    await supabase.from("follow_up_sequences").delete().eq("id", seq.id);
    router.refresh();
  }

  if (!open) {
    // A saved flow shows a compact summary row instead of an "open the form" button, so the list of
    // flows itself stays scannable — the button is only for actually starting a new one.
    return initial ? (
      <button type="button" onClick={() => setOpen(true)} className="card flex items-center gap-3 text-left hover:ring-2 hover:ring-primary">
        <span className={`h-2 w-2 shrink-0 rounded-full ${seq.is_active ? "bg-primary" : "bg-line"}`} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{seq.name || "Untitled"}</div>
          <div className="truncate text-xs text-muted">{seq.steps.length} step{seq.steps.length === 1 ? "" : "s"}{seq.form_key ? ` · auto-enrolls from “${seq.form_key}”` : " · added manually"}</div>
        </div>
      </button>
    ) : <button className="btn self-start border-dashed" onClick={() => setOpen(true)}>+ New flow</button>;
  }

  const form = (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-[1fr_200px_1fr_auto] md:items-end">
        <label className="label">Name<input className="input" value={seq.name} onChange={(e) => setSeq({ ...seq, name: e.target.value })} /></label>
        <label className="label">Lead type
          <select className="input" value={seq.category} onChange={(e) => setSeq({ ...seq, category: e.target.value as LeadFlowCategory })}>
            {LEAD_FLOW_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <label className="label">Auto-enroll from form (blank = none — add manually per lead)<input className="input" value={seq.form_key ?? ""} placeholder="tenant-screening" onChange={(e) => setSeq({ ...seq, form_key: e.target.value })} /></label>
        <label className="flex h-10 items-center gap-2">Active<input type="checkbox" checked={seq.is_active} onChange={(e) => setSeq({ ...seq, is_active: e.target.checked })} /></label>
      </div>
      <input className="input" placeholder="What this flow is for (shown to staff, not the lead)" value={seq.description ?? ""} onChange={(e) => setSeq({ ...seq, description: e.target.value })} />
      {seq.steps.map((s, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-xl border border-line p-4">
          <div className="flex flex-wrap items-center gap-2">
            <select className="input w-auto" value={s.channel} onChange={(e) => setStep(i, { channel: e.target.value as Step["channel"] })}>
              <option value="sms">SMS</option><option value="email">Email</option>
            </select>
            <select className="input w-auto" value={s.delay_minutes} onChange={(e) => setStep(i, { delay_minutes: Number(e.target.value) })}>
              {DELAYS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <button className="ml-auto text-sm text-red-700" onClick={() => setSeq({ ...seq, steps: seq.steps.filter((_, j) => j !== i) })}>Remove step</button>
          </div>
          {s.channel === "email" ? <input className="input" placeholder="Subject" value={s.subject ?? ""} onChange={(e) => setStep(i, { subject: e.target.value })} /> : null}
          {s.channel === "email" ? (
            <div className="flex gap-2 text-sm">
              <label className="flex items-center gap-1.5"><input type="radio" name={`layout-${i}`} checked={(s.layout ?? "plain") === "plain"} onChange={() => setStep(i, { layout: "plain" })} /> Plain text</label>
              <label className="flex items-center gap-1.5"><input type="radio" name={`layout-${i}`} checked={s.layout === "branded"} onChange={() => setStep(i, { layout: "branded" })} /> Branded (your logo, colors and a button)</label>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            {FIELD_TOKENS.map((t) => (
              <button key={t} type="button" title={PENDING_TOKENS.has(t) ? "Renders blank until matching/booking automation is built — safe to use now" : undefined}
                className={`rounded-full border px-2 py-0.5 text-xs hover:bg-soft ${PENDING_TOKENS.has(t) ? "border-dashed border-line text-muted" : "border-line text-primary"}`}
                onClick={() => setStep(i, { template: s.template + `{{${t}}}` })}>{t.replace(/_/g, " ")}</button>
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex flex-1 flex-col gap-2">
              <textarea className="textarea" rows={s.channel === "email" ? 5 : 2} value={s.template} onChange={(e) => setStep(i, { template: e.target.value })} />
              {s.channel === "sms" ? (
                <span className={`text-xs ${s.template.length + 23 > 160 ? "font-medium text-amber-700" : "text-muted"}`}>
                  {s.template.length + 23} characters incl. “Reply STOP to opt out.” {s.template.length + 23 > 160 ? "— over one SMS segment (160), may send as 2 messages" : "(160 = 1 SMS segment)"}
                </span>
              ) : null}
            </div>
            <StepPreview s={s} />
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button className="btn border-dashed" onClick={() => setSeq({ ...seq, steps: [...seq.steps, { delay_minutes: 0, channel: "sms", template: "" }] })}>+ Add step</button>
        <button className="btn-primary" onClick={save}>Save flow</button>
        {seq.id ? <button className="btn text-red-700" onClick={remove}>Delete</button> : <button className="btn" onClick={() => setOpen(false)}>Cancel</button>}
        {msg ? <span className="self-center text-sm text-muted">{msg}</span> : null}
      </div>
    </div>
  );

  return <Modal title={seq.id ? "Edit flow" : "New flow"} onClose={() => (initial ? setOpen(false) : (setSeq(BLANK), setOpen(false)))} wide>{form}</Modal>;
}
