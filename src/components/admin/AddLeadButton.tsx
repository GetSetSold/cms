"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LEAD_STATUSES } from "@/lib/types";

/** Add Lead button + modal for the admin leads page. */
export function AddLeadButton() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company: "",
    service: "",
    message: "",
    status: "new",
  });

  const set = (k: keyof typeof form, v: string) => setForm({ ...form, [k]: v });

  async function save() {
    if (!form.first_name.trim() && !form.email.trim() && !form.phone.trim()) {
      setMsg("Enter at least a name, email, or phone.");
      return;
    }
    setSaving(true);
    setMsg("");
    const supabase = createClient();
    const { error } = await supabase.from("leads").insert({
      first_name: form.first_name.trim() || null,
      last_name: form.last_name.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      company: form.company.trim() || null,
      service: form.service.trim() || null,
      message: form.message.trim() || null,
      status: form.status,
      form_key: "manual",
    });
    setSaving(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setOpen(false);
    window.location.reload();
  }

  const input = "input h-10 w-full";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-primary h-10 px-4 text-sm font-semibold">
        + Add Lead
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Add lead">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl">Add Lead</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-2xl leading-none text-muted hover:text-ink" aria-label="Close">×</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="label">First name<input className={input} value={form.first_name} onChange={(e) => set("first_name", e.target.value)} /></label>
              <label className="label">Last name<input className={input} value={form.last_name} onChange={(e) => set("last_name", e.target.value)} /></label>
              <label className="label">Email<input type="email" className={input} value={form.email} onChange={(e) => set("email", e.target.value)} /></label>
              <label className="label">Phone<input type="tel" className={input} value={form.phone} onChange={(e) => set("phone", e.target.value)} /></label>
              <label className="label">Company<input className={input} value={form.company} onChange={(e) => set("company", e.target.value)} /></label>
              <label className="label">Service
                <select className={input} value={form.service} onChange={(e) => set("service", e.target.value)}>
                  <option value="">—</option>
                  <option value="buying">Buying</option>
                  <option value="selling">Selling</option>
                  <option value="renting">Renting</option>
                  <option value="leasing">Leasing</option>
                  <option value="valuation">Home Valuation</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="label col-span-2">Status
                <select className={input} value={form.status} onChange={(e) => set("status", e.target.value)}>
                  {LEAD_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                </select>
              </label>
              <label className="label col-span-2">Notes<textarea className="textarea" rows={3} value={form.message} onChange={(e) => set("message", e.target.value)} /></label>
            </div>
            {msg ? <p className="mt-3 text-sm text-red-700" role="status">{msg}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn">Cancel</button>
              <button type="button" onClick={save} disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? "Saving…" : "Save Lead"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
