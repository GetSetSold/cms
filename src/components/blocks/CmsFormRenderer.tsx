"use client";
import { useRef, useState } from "react";
import type { CmsForm, FormField } from "@/lib/types";

type Values = Record<string, string | Record<string, string>[]>;

function inputType(t: FormField["type"]) {
  if (t === "number" || t === "decimal" || t === "currency") return "number";
  if (t === "date") return "date";
  if (["text", "email", "tel", "url"].includes(t)) return t;
  return "text";
}

function BasicField({ field, value, onChange }: { field: FormField; value: string; onChange: (v: string) => void }) {
  const base = "input h-12 text-base";
  switch (field.type) {
    case "textarea":
    case "address":
      return <textarea id={field.key} name={field.key} required={field.required} rows={field.type === "address" ? 2 : 4} className="textarea text-base" value={value} onChange={(e) => onChange(e.target.value)} />;
    case "dropdown":
      return (
        <select id={field.key} name={field.key} required={field.required} className={base} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    case "radio":
      return (
        <div className="flex flex-wrap gap-4 pt-1.5">
          {(field.options ?? []).map((o) => (
            <label key={o} className="flex items-center gap-1.5 text-sm">
              <input type="radio" name={field.key} value={o} checked={value === o} onChange={() => onChange(o)} required={field.required} /> {o}
            </label>
          ))}
        </div>
      );
    case "multiple_choice": {
      const selected = value ? value.split(",") : [];
      return (
        <div className="flex flex-wrap gap-4 pt-1.5">
          {(field.options ?? []).map((o) => (
            <label key={o} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={selected.includes(o)}
                onChange={(e) => onChange(e.target.checked ? [...selected, o].join(",") : selected.filter((s) => s !== o).join(","))} /> {o}
            </label>
          ))}
        </div>
      );
    }
    case "checkbox":
      return (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={value === "yes"} onChange={(e) => onChange(e.target.checked ? "yes" : "")} />
          Yes
        </label>
      );
    default:
      return <input id={field.key} name={field.key} type={inputType(field.type)} step={field.type === "decimal" || field.type === "currency" ? "0.01" : undefined}
        required={field.required} className={base} value={value} onChange={(e) => onChange(e.target.value)} />;
  }
}

function Subform({ field, rows, onChange }: { field: FormField; rows: Record<string, string>[]; onChange: (rows: Record<string, string>[]) => void }) {
  const subfields = field.subfields ?? [];
  const canAddMore = !field.max || rows.length < field.max;
  const addRow = () => onChange([...rows, {}]);
  const removeRow = (i: number) => onChange(rows.filter((_, j) => j !== i));
  const setCell = (i: number, key: string, v: string) => onChange(rows.map((r, j) => (j === i ? { ...r, [key]: v } : r)));

  return (
    <div className="flex flex-col gap-3 sm:col-span-2">
      <div className="text-sm font-medium">{field.label}</div>
      {rows.map((row, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-xl border border-line p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {subfields.map((sf) => (
              <label key={sf.key} className={`label ${sf.span === 2 ? "sm:col-span-2" : ""}`}>
                {sf.label}
                <BasicField field={sf} value={row[sf.key] ?? ""} onChange={(v) => setCell(i, sf.key, v)} />
              </label>
            ))}
          </div>
          <button type="button" onClick={() => removeRow(i)} className="self-start text-sm text-red-700">Remove</button>
        </div>
      ))}
      {canAddMore ? (
        <button type="button" onClick={addRow} className="btn self-start border-dashed">+ {field.repeat_label || "Add another"}</button>
      ) : null}
    </div>
  );
}

export function CmsFormRenderer({ form, pageId }: { form: CmsForm; pageId?: string }) {
  const [values, setValues] = useState<Values>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const started = useRef(Date.now());

  if (form.embed_html) {
    // Admin/editor-authored embed (e.g. Zoho) — same trust boundary as other admin HTML in this CMS.
    return <div dangerouslySetInnerHTML={{ __html: form.embed_html }} />;
  }

  const sections = form.sections ?? [];
  const set = (key: string, v: string | Record<string, string>[]) => setValues((s) => ({ ...s, [key]: v }));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending"); setError("");

    const str = (k: string) => (typeof values[k] === "string" ? (values[k] as string) : "");
    const name = [str("first_name"), str("last_name")].filter(Boolean).join(" ") || str("name");
    const contactKeys = new Set(["first_name", "last_name", "name", "email", "phone"]);
    const customFields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(values)) if (!contactKeys.has(k)) customFields[k] = v;

    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submit-lead`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        name, email: str("email"), phone: str("phone"),
        form_key: form.form_key,
        page_id: pageId,
        path: window.location.pathname,
        custom_fields: customFields,
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
    <form onSubmit={onSubmit} className="flex flex-col gap-8">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {sections.map((section) => (
        <fieldset key={section.id} className="flex flex-col gap-3">
          {section.heading ? <legend className="mb-1 text-lg font-semibold">{section.heading}</legend> : null}
          <div className={`grid gap-3 ${section.columns === 2 ? "sm:grid-cols-2" : ""}`}>
            {section.fields.map((f) =>
              f.type === "subform" ? (
                <Subform key={f.key} field={f} rows={(values[f.key] as Record<string, string>[]) ?? []} onChange={(rows) => set(f.key, rows)} />
              ) : (
                <label key={f.key} className={`label ${f.span === 2 || section.columns === 1 ? "sm:col-span-2" : ""}`}>
                  {f.type !== "checkbox" ? f.label : null}
                  <BasicField field={f} value={typeof values[f.key] === "string" ? (values[f.key] as string) : ""} onChange={(v) => set(f.key, v)} />
                </label>
              ),
            )}
          </div>
        </fieldset>
      ))}
      {state === "error" ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
      <button disabled={state === "sending"} className="h-13 rounded-full bg-ink py-3.5 text-base font-medium text-white disabled:opacity-60">
        {state === "sending" ? "Sending…" : form.submit_label}
      </button>
    </form>
  );
}
