"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LEAD_FLOW_CATEGORIES, type LeadFlowCategory } from "@/lib/types";
import { Modal } from "@/components/admin/Modal";

type Step = { delay_minutes: number; channel: "sms" | "email"; subject?: string; template: string };
type Seq = { id?: string; name: string; description: string | null; category: LeadFlowCategory; trigger: string; form_key: string | null; is_active: boolean; steps: Step[] };

const DELAYS = [
  [0, "Immediately"], [60, "After 1 hour"], [240, "After 4 hours"], [1440, "After 1 day"],
  [2880, "After 2 days"], [4320, "After 3 days"], [10080, "After 1 week"],
] as const;

const BLANK: Seq = { name: "", description: null, category: "general", trigger: "lead_created", form_key: null, is_active: false, steps: [] };

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
          <textarea className="textarea" rows={s.channel === "email" ? 5 : 2} value={s.template} onChange={(e) => setStep(i, { template: e.target.value })} />
          {s.channel === "sms" ? <span className="text-xs text-muted">{s.template.length + 23} characters incl. “Reply STOP to opt out.” (160 = 1 SMS segment)</span> : null}
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
