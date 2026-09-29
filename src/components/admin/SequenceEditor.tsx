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
const BROKERAGE = "Lombard Group Real Estate Inc., Brokerage"; // preview-only — matches brandedEmailHtml's optional `brokerage` field
const initials = (name: string) => name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const fill = (tpl: string) => tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => SAMPLE[k] ?? "");

/** A realistic phone-frame SMS preview or a browser-chrome branded-email preview, matching the
 *  approved template mockup — so a flow can be checked for tone and layout before it ever sends.
 *  Sample values fill the {{tokens}}. */
function StepPreview({ s }: { s: Step }) {
  if (s.channel === "sms") {
    const text = fill(s.template) + (s.template.trim() ? "\nReply STOP to opt out." : "");
    return (
      <div className="w-full max-w-[300px] shrink-0 self-start">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted">
          <span>Live preview</span>
        </div>
        <div className="overflow-hidden rounded-[32px] border-[6px] border-[#0B0B0F] bg-white shadow-lg">
          <div className="relative flex h-6 items-center justify-center bg-[#0B0B0F]">
            <div className="h-3.5 w-20 rounded-full bg-black" />
          </div>
          <div className="flex flex-col items-center gap-1 border-b border-line py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2563eb] text-xs font-bold text-white">{initials(SAMPLE.agent_name)}</span>
            <strong className="text-sm">{SAMPLE.agent_name}</strong>
          </div>
          <div className="flex min-h-[180px] flex-col gap-1.5 bg-[#F4F4F6] px-3 py-4">
            <div className="mb-1 text-center text-[10px] text-muted">Today {new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
            {text.trim() ? (
              <>
                <div className="max-w-[85%] self-start rounded-2xl rounded-bl-sm bg-[#E9E9EB] px-3 py-2 text-[13px] leading-snug text-ink">{text}</div>
                <span className="self-start pl-1 text-[10px] text-muted">Delivered</span>
              </>
            ) : <p className="mt-6 text-center text-[13px] text-muted">Start typing to preview the message…</p>}
          </div>
          <div className="border-t border-line bg-white px-3 py-2">
            <div className="rounded-full bg-[#F4F4F6] px-3 py-1.5 text-xs text-muted">Text Message</div>
          </div>
        </div>
      </div>
    );
  }

  const subject = fill(s.subject ?? "");
  const body = fill(s.template);
  const branded = (s.layout ?? "plain") === "branded";
  return (
    <div className="w-full max-w-[320px] shrink-0 self-start">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Live preview</div>
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-md">
        <div className="flex gap-1.5 border-b border-line bg-[#F4F4F6] px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#D8D8DC]" /><span className="h-2.5 w-2.5 rounded-full bg-[#D8D8DC]" /><span className="h-2.5 w-2.5 rounded-full bg-[#D8D8DC]" />
        </div>
        {branded ? (
          <div className="bg-[#14142B] px-5 py-4 text-white">
            <div className="text-base font-bold">{SAMPLE.site_name}</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-wide text-white/60">{BROKERAGE}</div>
          </div>
        ) : null}
        <div className="p-5 text-[13px]">
          {branded ? <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[#2563eb]">Personal real estate guidance</div>
            : <div className="mb-2 border-b border-line pb-2 text-xs text-muted">Subject: <strong className="text-ink">{subject || "(no subject yet)"}</strong></div>}
          {branded ? <div className="mb-3 text-lg font-bold leading-tight text-ink">{subject || "(no subject yet)"}</div> : null}
          <p className="whitespace-pre-line leading-relaxed text-muted">{body || "Start typing to preview the message…"}</p>
          {branded ? (
            <>
              <span className="mt-4 inline-block rounded-full bg-[#2563eb] px-5 py-2 text-xs font-semibold text-white">View your next step</span>
              <div className="mt-5 border-t border-line pt-3 text-xs text-muted">
                <strong className="text-ink">{SAMPLE.agent_name}, REALTOR®</strong><br />{BROKERAGE}
              </div>
            </>
          ) : null}
        </div>
        {branded ? <div className="border-t border-line px-5 py-2.5 text-[10px] text-muted">You're receiving this message because you requested real estate information.</div> : null}
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

  return <Modal title={seq.id ? "Edit flow" : "New flow"} onClose={() => (initial ? setOpen(false) : (setSeq(BLANK), setOpen(false)))} size="xl">{form}</Modal>;
}
