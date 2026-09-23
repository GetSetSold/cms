"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@/lib/types";

export function LeadActions({ lead, pendingCount }: { lead: Lead; pendingCount: number }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [note, setNote] = useState("");
  const [sms, setSms] = useState("");
  const [msg, setMsg] = useState("");
  const canSms = !!lead.phone && lead.sms_opt_in && !lead.sms_opted_out;

  async function changeStatus(s: LeadStatus) {
    setStatus(s);
    const { error } = await supabase.from("leads").update({ status: s }).eq("id", lead.id);
    setMsg(error ? error.message : "Status updated"); router.refresh();
  }
  async function addNote() {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("lead_activities").insert({ lead_id: lead.id, type: "note", body: note, created_by: user?.id });
    if (!error) setNote("");
    setMsg(error ? error.message : "Note added"); router.refresh();
  }
  async function sendSms() {
    const { data, error } = await supabase.functions.invoke("send-sms", { body: { lead_id: lead.id, body: sms } });
    if (error || data?.error) return setMsg(data?.error ?? error?.message ?? "Failed");
    setSms(""); setMsg("SMS sent"); router.refresh();
  }
  async function stopAutomation() {
    await supabase.from("follow_up_queue").update({ status: "skipped" }).eq("lead_id", lead.id).eq("status", "pending");
    setMsg("Automation stopped"); router.refresh();
  }

  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
      <div className="card flex flex-col gap-3">
        <label className="label">Status
          <select className="input capitalize" value={status} onChange={(e) => changeStatus(e.target.value as LeadStatus)}>
            {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {lead.phone ? <a className="btn" href={`tel:${lead.phone}`}>Call</a> : null}
          {lead.email ? <a className="btn" href={`mailto:${lead.email}`}>Email</a> : null}
        </div>
        {pendingCount > 0 ? (
          <button className="btn" onClick={stopAutomation}>Stop {pendingCount} scheduled follow-up{pendingCount > 1 ? "s" : ""}</button>
        ) : null}
      </div>
      <div className="card flex flex-col gap-3">
        <strong>Send SMS</strong>
        {canSms ? (
          <>
            <textarea className="textarea" rows={3} maxLength={1200} value={sms} onChange={(e) => setSms(e.target.value)} />
            <button className="btn-primary" disabled={!sms.trim()} onClick={sendSms}>Send</button>
          </>
        ) : (
          <p className="text-[13px] text-muted">{lead.sms_opted_out ? "This lead replied STOP." : !lead.phone ? "No phone number." : "No SMS consent — call or email instead."}</p>
        )}
      </div>
      <div className="card flex flex-col gap-3">
        <strong>Add a note</strong>
        <textarea className="textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="btn" disabled={!note.trim()} onClick={addNote}>Save note</button>
      </div>
      {msg ? <p className="text-sm text-muted" role="status">{msg}</p> : null}
    </aside>
  );
}
