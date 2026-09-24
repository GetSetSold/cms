"use client";
import { useRef, useState } from "react";
import type { CmsForm, FormField } from "@/lib/types";

function Field({ field, value, onChange }: { field: FormField; value: string; onChange: (v: string) => void }) {
  const common = { id: field.key, name: field.key, required: field.required, className: "input h-12 text-base" };
  switch (field.type) {
    case "textarea":
      return <textarea {...common} rows={4} className="textarea text-base" value={value} onChange={(e) => onChange(e.target.value)} />;
    case "select":
      return (
        <select {...common} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    case "checkbox":
      return (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={value === "yes"} onChange={(e) => onChange(e.target.checked ? "yes" : "")} />
          {field.label}
        </label>
      );
    default:
      return <input {...common} type={field.type} value={value} onChange={(e) => onChange(e.target.value)} />;
  }
}

export function CmsFormRenderer({ form, pageId }: { form: CmsForm; pageId?: string }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const started = useRef(Date.now());

  if (form.embed_html) {
    // Admin/editor-authored embed (e.g. Zoho) — same trust boundary as other admin HTML in this CMS.
    return <div dangerouslySetInnerHTML={{ __html: form.embed_html }} />;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending"); setError("");
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submit-lead`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        name: values.name, email: values.email, phone: values.phone,
        message: values.message,
        form_key: form.form_key,
        page_id: pageId,
        path: window.location.pathname,
        custom_fields: Object.fromEntries(
          form.fields.filter((f) => !["name", "email", "phone", "message"].includes(f.key)).map((f) => [f.key, values[f.key] ?? ""]),
        ),
        elapsed_ms: Date.now() - started.current,
      }),
    }).catch(() => null);
    const body = await res?.json().catch(() => ({}));
    if (res?.ok) setState("done");
    else { setState("error"); setError(body?.error ?? "Something went wrong. Please try again."); }
  }

  if (state === "done") {
    return <div className="rounded-2xl bg-white p-8 text-center" role="status"><p className="font-display text-2xl font-bold">{form.success_message}</p></div>;
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {form.fields.map((f) => (
        <label key={f.key} className={`label ${f.type === "textarea" ? "sm:col-span-2" : ""}`}>
          {f.type !== "checkbox" ? f.label : null}
          <Field field={f} value={values[f.key] ?? ""} onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))} />
        </label>
      ))}
      {state === "error" ? <p className="text-sm text-red-700 sm:col-span-2" role="alert">{error}</p> : null}
      <button disabled={state === "sending"} className="h-13 rounded-full bg-ink py-3.5 text-base font-medium text-white disabled:opacity-60 sm:col-span-2">
        {state === "sending" ? "Sending…" : form.submit_label}
      </button>
    </form>
  );
}
