"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CmsFormRenderer } from "@/components/blocks/CmsFormRenderer";
import type { CmsForm } from "@/lib/types";

type FormOption = { id: string; name: string; slug: string };

/** Attach a form to a lead: staff fills it now, or copy a send-to-fill link. */
export function AttachFormButton({ leadId, leadName }: { leadId: string; leadName: string }) {
  const [open, setOpen] = useState(false);
  const [forms, setForms] = useState<FormOption[]>([]);
  const [formId, setFormId] = useState("");
  const [filling, setFilling] = useState<CmsForm | null>(null);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    createClient().from("forms").select("id,name,slug").eq("is_active", true).order("name")
      .then(({ data }) => setForms((data ?? []) as FormOption[]));
  }, [open ]);

  async function loadForm() {
    if (!formId) return;
    setBusy(true); setMsg("");
    const { data, error } = await createClient().from("forms").select("*").eq("id", formId).single();
    setBusy(false);
    if (error || !data) { setMsg("Could not load form."); return; }
    setFilling(data as CmsForm);
  }

  async function submitAnswers(answers: Record<string, unknown>): Promise<true | string> {
    try {
      const res = await fetch("/api/lead-form-attachments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, form_id: formId, answers }),
      });
      const data = await res.json();
      if (!res.ok) return data.error ?? "Failed to attach.";
      return true;
    } catch {
      return "Failed to attach.";
    }
  }

  async function createLink() {
    if (!formId) return;
    setBusy(true); setMsg(""); setLink("");
    try {
      const res = await fetch("/api/lead-form-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, form_id: formId }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error ?? "Failed."); return; }
      setLink(data.url);
    } catch {
      setMsg("Failed.");
    } finally {
      setBusy(false);
    }
  }

  if (filling) {
    return (
      <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/50 p-4" onClick={() => setFilling(null)}>
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <strong className="text-lg">{filling.name}</strong>
              <p className="text-sm text-muted">Filling for {leadName} — answers attach to their lead record.</p>
            </div>
            <button className="btn" onClick={() => setFilling(null)}>Close</button>
          </div>
          <CmsFormRenderer form={filling} onSubmitAnswers={submitAnswers} />
        </div>
      </div>
    );
  }

  return (
    <>
      <button className="btn" onClick={() => { setOpen(true); setLink(""); setMsg(""); }}>Attach form</button>
      {open ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <strong className="text-lg">Attach form to {leadName}</strong>
            <label className="label mt-4">Choose a form
              <select className="input" value={formId} onChange={(e) => setFormId(e.target.value)}>
                <option value="">Select…</option>
                {forms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </label>
            {link ? (
              <div className="mt-4 flex flex-col gap-2">
                <input className="input font-mono text-xs" readOnly value={link} onFocus={(e) => e.target.select()} />
                <button className="btn-primary" onClick={async () => {
                  try { await navigator.clipboard.writeText(link); setMsg("Copied."); }
                  catch { setMsg("Copy failed — select the link manually."); }
                }}>Copy link</button>
                <p className="text-xs text-muted">They fill it, answers attach to this lead. Link expires in 7 days.</p>
              </div>
            ) : (
              <div className="mt-4 flex gap-2">
                <button className="btn-primary flex-1" disabled={!formId || busy} onClick={loadForm}>
                  {busy ? "Loading…" : "Fill now"}
                </button>
                <button className="btn flex-1" disabled={!formId || busy} onClick={createLink}>
                  Send-to-fill link
                </button>
              </div>
            )}
            {msg ? <p className="mt-3 text-sm text-muted" role="status">{msg}</p> : null}
            <button className="btn mt-4 w-full" onClick={() => setOpen(false)}>Close</button>
          </div>
        </div>
      ) : null}
    </>
  );
}
