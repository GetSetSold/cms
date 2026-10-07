"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@/lib/types";
import { ShareApplicationButton } from "./ShareApplicationButton";
import { AttachFormButton } from "./AttachFormButton";

export function LeadActions({ lead, pendingCount }: { lead: Lead; pendingCount: number }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [note, setNote] = useState("");
  const [sms, setSms] = useState("");
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(lead.first_name ?? "");
  const [lastName, setLastName] = useState(lead.last_name ?? "");
  const [email, setEmail] = useState(lead.email ?? "");
  const [phone, setPhone] = useState(lead.phone ?? "");
  const [saving, setSaving] = useState(false);
  const canSms = !!lead.phone && lead.sms_opt_in && !lead.sms_opted_out;

  async function saveContact() {
    setSaving(true);
    const { error } = await supabase.from("leads").update({
      first_name: firstName.trim() || null,
      last_name: lastName.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
    }).eq("id", lead.id);
    setSaving(false);
    if (error) { setMsg(error.message); return; }
    setEditing(false); setMsg("Contact updated"); router.refresh();
  }

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
  async function deleteLead() {
    const label = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || lead.email || lead.phone || "this lead";
    if (!confirm(`Delete ${label}? This removes the lead and its history from the database. This cannot be undone.`)) return;
    setMsg("Deleting…");
    // Clean up child records first (in case FKs lack CASCADE).
    await supabase.from("lead_activities").delete().eq("lead_id", lead.id);
    await supabase.from("follow_up_queue").delete().eq("lead_id", lead.id);
    await supabase.from("lead_flow_enrollments").delete().eq("lead_id", lead.id);
    const { error } = await supabase.from("leads").delete().eq("id", lead.id);
    if (error) { setMsg(error.message); return; }
    router.push("/admin/leads");
    router.refresh();
  }

  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
      <div className="card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <strong>Contact</strong>
          {!editing ? (
            <button className="btn h-8 px-3 text-[12px]" onClick={() => setEditing(true)}>Edit</button>
          ) : null}
        </div>
        {!editing ? (
          <dl className="flex flex-col gap-1.5 text-[14px]">
            <div><dt className="text-xs uppercase tracking-wide text-muted">Name</dt><dd>{[lead.first_name, lead.last_name].filter(Boolean).join(" ") || "—"}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-muted">Email</dt><dd className="break-all">{lead.email || "—"}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-muted">Phone</dt><dd>{lead.phone || "—"}</dd></div>
          </dl>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <label className="label">First name<input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></label>
              <label className="label">Last name<input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} /></label>
            </div>
            <label className="label">Email<input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label className="label">Phone<input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" disabled={saving} onClick={saveContact}>{saving ? "Saving…" : "Save"}</button>
              <button className="btn" onClick={() => { setEditing(false); setFirstName(lead.first_name ?? ""); setLastName(lead.last_name ?? ""); setEmail(lead.email ?? ""); setPhone(lead.phone ?? ""); }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
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
      <button
        className="btn border-red-200 text-red-600 hover:bg-red-50"
        onClick={deleteLead}
      >
        Delete lead
      </button>
      {lead.form_key === "rental_application" ? <ShareApplicationButton leadId={lead.id} /> : null}
      <AttachFormButton leadId={lead.id} leadName={`${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim() || "this lead"} />
      {msg ? <p className="text-sm text-muted" role="status">{msg}</p> : null}
    </aside>
  );
}
