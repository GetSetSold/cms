"use client";
import { useEffect, useRef, useState } from "react";
import type { CmsForm, FormField, FormSection } from "@/lib/types";

type Row = Record<string, string>;
type Value = string | Row[];
type Values = Record<string, Value>;
type Errors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GROUP_TYPES: FormField["type"][] = ["radio", "multiple_choice", "checkbox"];

/** State and DOM ids are namespaced by section. Forms built before the editor guaranteed unique
 *  keys can have two fields sharing a key (every section's first field used to be "field_1");
 *  keyed this way they stay independent instead of sharing one answer. */
const uid = (sectionId: string, key: string) => `${sectionId}__${key}`;

function inputType(t: FormField["type"]) {
  if (t === "number" || t === "decimal" || t === "currency") return "number";
  if (t === "date") return "date";
  if (["text", "email", "tel", "url"].includes(t)) return t;
  return "text";
}

/** Our own validation instead of the browser's. The browser validates EVERY required control in the
 *  form — including ones on steps that are hidden — and silently refuses to continue when one of
 *  those is empty, which is what made "Next" do nothing on multi-step forms. It also can't enforce a
 *  required checkbox group or repeatable group at all. */
function fieldError(f: FormField, v: Value | undefined): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (f.type === "checkbox") return f.required && v !== "yes" ? "Please tick this box to continue." : null;
  if (!s) {
    if (!f.required) return null;
    if (f.type === "multiple_choice") return "Choose at least one option.";
    if (f.type === "radio" || f.type === "dropdown") return "Please choose an option.";
    return "This field is required.";
  }
  if (f.type === "email" && !EMAIL_RE.test(s)) return "Enter a valid email address.";
  if (f.type === "url") { try { new URL(s); } catch { return "Enter a valid web address, including https://"; } }
  if ((f.type === "number" || f.type === "decimal" || f.type === "currency") && !Number.isFinite(Number(s))) return "Enter a valid number.";
  return null;
}

function sectionErrors(sec: FormSection, values: Values): Errors {
  const out: Errors = {};
  for (const f of sec.fields) {
    const id = uid(sec.id, f.key);
    if (f.type === "subform") {
      const rows = (values[id] as Row[] | undefined) ?? [];
      if (f.required && rows.length === 0) out[id] = "Please add at least one entry.";
      rows.forEach((row, i) => (f.subfields ?? []).forEach((sf) => {
        const e = fieldError(sf, row[sf.key]);
        if (e) out[`${id}.${i}.${sf.key}`] = e;
      }));
    } else {
      const e = fieldError(f, values[id]);
      if (e) out[id] = e;
    }
  }
  return out;
}

function BasicField({ field, id, value, onChange, error }: { field: FormField; id: string; value: string; onChange: (v: string) => void; error?: string }) {
  const base = "input h-12 text-base";
  const a11y = { "aria-invalid": error ? true : undefined, "aria-required": field.required || undefined, "aria-describedby": error ? `${id}-err` : undefined } as const;
  switch (field.type) {
    case "textarea":
    case "address":
      return <textarea id={id} name={id} rows={field.type === "address" ? 2 : 4} className="textarea text-base" value={value} onChange={(e) => onChange(e.target.value)} {...a11y} />;
    case "dropdown":
      return (
        <select id={id} name={id} className={base} value={value} onChange={(e) => onChange(e.target.value)} {...a11y}>
          <option value="">Select…</option>
          {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    case "radio":
      return (
        <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex flex-wrap gap-4 pt-1.5">
          {(field.options ?? []).map((o) => (
            <label key={o} className="flex items-center gap-1.5 text-sm">
              <input type="radio" name={id} value={o} checked={value === o} onChange={() => onChange(o)} {...a11y} /> {o}
            </label>
          ))}
        </div>
      );
    case "multiple_choice": {
      const selected = value ? value.split(",") : [];
      return (
        <div role="group" aria-labelledby={`${id}-label`} className="flex flex-wrap gap-4 pt-1.5">
          {(field.options ?? []).map((o) => (
            <label key={o} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={selected.includes(o)} {...a11y}
                onChange={(e) => onChange(e.target.checked ? [...selected, o].join(",") : selected.filter((s) => s !== o).join(","))} /> {o}
            </label>
          ))}
        </div>
      );
    }
    case "checkbox":
      return (
        <label className="flex items-center gap-2 text-sm">
          <input id={id} type="checkbox" checked={value === "yes"} onChange={(e) => onChange(e.target.checked ? "yes" : "")} aria-labelledby={`${id}-label`} {...a11y} />
          Yes
        </label>
      );
    default:
      return <input id={id} name={id} type={inputType(field.type)} step={field.type === "decimal" || field.type === "currency" ? "0.01" : undefined}
        className={base} value={value} onChange={(e) => onChange(e.target.value)} {...a11y} />;
  }
}

/** Label + control + inline error. Groups (radio / checkbox sets) get a text label tied to the
 *  group, not a <label> — a <label> around several inputs makes clicking the question toggle the
 *  first option, and checkbox fields previously showed no question text at all. */
function Question({ field, id, error, className = "", children }: { field: FormField; id: string; error?: string; className?: string; children: React.ReactNode }) {
  const star = field.required ? <span className="text-primary"> *</span> : null;
  const grouped = GROUP_TYPES.includes(field.type);
  return (
    <div className={`flex flex-col gap-1.5 text-[15px] ${className}`}>
      {grouped
        ? <span id={`${id}-label`} className="font-medium text-ink">{field.label}{star}</span>
        : <label htmlFor={id} className="font-medium text-ink">{field.label}{star}</label>}
      {children}
      {error ? <p id={`${id}-err`} role="alert" className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

function Subform({ field, id, rows, errors, onChange }: { field: FormField; id: string; rows: Row[]; errors: Errors; onChange: (rows: Row[]) => void }) {
  const subfields = field.subfields ?? [];
  const canAddMore = !field.max || rows.length < field.max;
  const addRow = () => onChange([...rows, {}]);
  const removeRow = (i: number) => onChange(rows.filter((_, j) => j !== i));
  const setCell = (i: number, key: string, v: string) => onChange(rows.map((r, j) => (j === i ? { ...r, [key]: v } : r)));

  return (
    <div className="flex flex-col gap-3 sm:col-span-2" role="group" aria-labelledby={`${id}-label`}>
      <div id={`${id}-label`} className="text-sm font-medium">{field.label}{field.required ? <span className="text-primary"> *</span> : null}</div>
      {rows.map((row, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-xl border border-line p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {subfields.map((sf) => {
              const cellId = `${id}.${i}.${sf.key}`;
              return (
                <Question key={sf.key} field={sf} id={cellId} error={errors[cellId]} className={sf.span === 2 ? "sm:col-span-2" : ""}>
                  <BasicField field={sf} id={cellId} value={row[sf.key] ?? ""} onChange={(v) => setCell(i, sf.key, v)} error={errors[cellId]} />
                </Question>
              );
            })}
          </div>
          <button type="button" onClick={() => removeRow(i)} className="self-start text-sm text-red-700">Remove</button>
        </div>
      ))}
      {errors[id] ? <p id={`${id}-err`} role="alert" className="text-sm text-red-700">{errors[id]}</p> : null}
      {canAddMore ? (
        <button type="button" onClick={addRow} aria-invalid={errors[id] ? true : undefined} className="btn self-start border-dashed">+ {field.repeat_label || "Add another"}</button>
      ) : null}
    </div>
  );
}

function SectionBlock({ section, active, values, errors, onFieldChange }: {
  section: FormSection; active: boolean; values: Values; errors: Errors; onFieldChange: (id: string, v: Value) => void;
}) {
  // `hidden` (not unmounting) keeps entered values intact when navigating back in a paginated form.
  // Validation is our own (see fieldError), so hidden steps can never block Next or Submit.
  return (
    <div hidden={!active} role="group" aria-label={section.heading} className={`flex flex-col gap-4 ${section.background ? "rounded-2xl p-6" : ""}`} style={section.background ? { background: section.background } : undefined}>
      {section.heading ? <div className="border-b border-line pb-2.5 text-lg font-semibold">{section.heading}</div> : null}
      <div className={`grid gap-4 ${section.columns === 2 ? "sm:grid-cols-2" : ""}`}>
        {section.fields.map((f) => {
          const id = uid(section.id, f.key);
          if (f.type === "subform") {
            return <Subform key={id} field={f} id={id} rows={(values[id] as Row[]) ?? []} errors={errors} onChange={(rows) => onFieldChange(id, rows)} />;
          }
          return (
            <Question key={id} field={f} id={id} error={errors[id]} className={f.span === 2 || section.columns === 1 ? "sm:col-span-2" : ""}>
              <BasicField field={f} id={id} value={typeof values[id] === "string" ? (values[id] as string) : ""} onChange={(v) => onFieldChange(id, v)} error={errors[id]} />
            </Question>
          );
        })}
      </div>
    </div>
  );
}

export function CmsFormRenderer({ form, pageId }: { form: CmsForm; pageId?: string }) {
  const [values, setValues] = useState<Values>({});
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const [focusTick, setFocusTick] = useState(0);
  const started = useRef(Date.now());
  const formRef = useRef<HTMLFormElement>(null);
  const firstRender = useRef(true);

  const sections = form.sections ?? [];
  const paginated = !!form.paginate && sections.length > 1;
  const lastStep = step === sections.length - 1;
  const set = (id: string, v: Value) => {
    setValues((s) => ({ ...s, [id]: v }));
    // an answer changed: drop that question's error (and any of its repeat-row errors)
    setErrors((prev) => {
      const stale = Object.keys(prev).filter((k) => k === id || k.startsWith(`${id}.`));
      if (!stale.length) return prev;
      const next = { ...prev };
      stale.forEach((k) => delete next[k]);
      return next;
    });
  };

  // When the step changes, bring the form back into view. On a tall step the Next button is far
  // down the page; the next step renders at the top of the form, off-screen, and it looks like
  // nothing happened.
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    const el = formRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight * 0.6) {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: window.scrollY + top - 96, behavior: reduce ? "auto" : "smooth" });
    }
  }, [step]);

  // After a failed Next/Submit, move to the first question that needs attention.
  useEffect(() => {
    if (!focusTick) return;
    const el = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    el?.focus({ preventScroll: true });
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focusTick]);

  if (form.embed_html) {
    // Admin/editor-authored embed (e.g. Zoho) — same trust boundary as other admin HTML in this CMS.
    return <div dangerouslySetInnerHTML={{ __html: form.embed_html }} />;
  }

  function goNext() {
    const errs = sectionErrors(sections[step], values);
    if (Object.keys(errs).length) { setErrors((prev) => ({ ...prev, ...errs })); setFocusTick((t) => t + 1); return; }
    setStep((s) => Math.min(s + 1, sections.length - 1));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "sending") return;
    if (paginated && !lastStep) { goNext(); return; }

    // Check every section (not just the visible one) so nothing can be skipped; if a problem is on an
    // earlier step, go back to it.
    const all: Errors = {};
    let firstBad = -1;
    sections.forEach((sec, i) => {
      const errs = sectionErrors(sec, values);
      if (Object.keys(errs).length) { Object.assign(all, errs); if (firstBad < 0) firstBad = i; }
    });
    if (firstBad >= 0) {
      setErrors(all);
      if (paginated) setStep(firstBad);
      setFocusTick((t) => t + 1);
      return;
    }

    setState("sending"); setError("");

    // Flatten to plain question keys for the lead pipeline. If two questions share a key, the later
    // ones are saved as key_2, key_3… so no answer overwrites another.
    const flat: Record<string, Value> = {};
    const seen: Record<string, number> = {};
    for (const sec of sections) for (const f of sec.fields) {
      const v = values[uid(sec.id, f.key)];
      if (v === undefined) continue;
      let key = f.key;
      if (key in flat) { seen[f.key] = (seen[f.key] ?? 1) + 1; key = `${f.key}_${seen[f.key]}`; }
      flat[key] = v;
    }
    const str = (k: string) => (typeof flat[k] === "string" ? (flat[k] as string) : "");
    const name = [str("first_name"), str("last_name")].filter(Boolean).join(" ") || str("name");
    const contactKeys = new Set(["first_name", "last_name", "name", "email", "phone"]);
    const customFields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(flat)) if (!contactKeys.has(k)) customFields[k] = v;
    // The spam-trap field. The server drops the submission if a bot filled it in.
    const honeypot = (formRef.current?.elements.namedItem("contact_extra") as HTMLInputElement | null)?.value ?? "";

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
        website: honeypot,
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

  // Errors on the steps/sections currently on screen (for the summary line).
  const shownErrors = sections.reduce((n, sec, i) => (!paginated || i === step ? n + Object.keys(errors).filter((k) => k.startsWith(`${sec.id}__`)).length : n), 0);

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="flex scroll-mt-24 flex-col gap-6">
      {/* Spam trap: invisible to people, filled in by bots. Deliberately NOT named "website" — browsers and password managers autofill that, and a filled trap makes the server drop the lead. */}
      <input type="text" name="contact_extra" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      {paginated ? (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted" aria-live="polite">Step {step + 1} of {sections.length}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-soft">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((step + 1) / sections.length) * 100}%` }} />
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-8">
        {sections.map((section, i) => (
          <SectionBlock key={section.id} section={section} active={!paginated || i === step} values={values} errors={errors} onFieldChange={set} />
        ))}
      </div>

      {shownErrors ? <p className="text-sm font-medium text-red-700" role="alert">Please complete the {shownErrors === 1 ? "highlighted question" : `${shownErrors} highlighted questions`} to continue.</p> : null}
      {state === "error" ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}

      {paginated ? (
        <div className="flex gap-3">
          {step > 0 ? <button type="button" onClick={() => setStep((s) => s - 1)} className="btn h-13 flex-1">Back</button> : null}
          <button type="submit" disabled={state === "sending"} className="h-13 flex-1 rounded-full bg-ink py-3.5 text-base font-medium text-white disabled:opacity-60">
            {lastStep ? (state === "sending" ? "Sending…" : form.submit_label) : "Next"}
          </button>
        </div>
      ) : (
        <button type="submit" disabled={state === "sending"} className="h-13 rounded-full bg-ink py-3.5 text-base font-medium text-white disabled:opacity-60">
          {state === "sending" ? "Sending…" : form.submit_label}
        </button>
      )}
    </form>
  );
}
