"use client";
import { useEffect, useRef, useState } from "react";
import type { CmsForm, FormField, FormSection } from "@/lib/types";
import { limitsFor, NUMERIC_TYPES, pipe, repeatCount, resolve, uid, type Resolved, type Row, type Value, type Values } from "@/lib/formLogic";

type Errors = Record<string, string>;
type Limits = { min?: number; max?: number };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GROUP_TYPES: FormField["type"][] = ["radio", "multiple_choice", "checkbox"];

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
function fieldError(f: FormField, v: Value | undefined, lim: Limits = {}): string | null {
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
  if (NUMERIC_TYPES.includes(f.type)) {
    const n = Number(s);
    if (!Number.isFinite(n)) return "Enter a valid number.";
    if (f.whole && !Number.isInteger(n)) return "Enter a whole number.";
    if (lim.min !== undefined && n < lim.min) return `Must be at least ${lim.min}.`;
    if (lim.max !== undefined && n > lim.max) return `Must be no more than ${lim.max}.`;
  }
  return null;
}

/** The entries currently shown for a repeatable group: exactly `count` when its size follows an
 *  answer (keeping whatever was already typed), otherwise whatever the person has added. */
function rowsFor(stored: Row[] | undefined, count: number | undefined): Row[] {
  const rows = stored ?? [];
  return count === undefined ? rows : Array.from({ length: count }, (_, i) => rows[i] ?? {});
}

function sectionErrors(sec: FormSection, values: Values, r: Resolved): Errors {
  const out: Errors = {};
  for (const f of sec.fields) {
    const id = uid(sec.id, f.key);
    if (!r.visible.has(id)) continue; // a question that isn't showing can't block anything
    if (f.type === "subform") {
      const count = repeatCount(f, values, r);
      if (count === 0) continue;
      const rows = rowsFor(values[id] as Row[] | undefined, count);
      if (count === undefined && f.required && rows.length === 0) out[id] = "Please add at least one entry.";
      rows.forEach((row, i) => (f.subfields ?? []).forEach((sf) => {
        const e = fieldError(sf, row[sf.key], { min: sf.min_value, max: sf.max_value });
        if (e) out[`${id}.${i}.${sf.key}`] = e;
      }));
    } else {
      const e = fieldError(f, values[id], limitsFor(f, values, r));
      if (e) out[id] = e;
    }
  }
  return out;
}

function BasicField({ field, id, value, onChange, onBlur, error, limits }: { field: FormField; id: string; value: string; onChange: (v: string) => void; onBlur?: () => void; error?: string; limits?: Limits }) {
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
      return <input id={id} name={id} type={inputType(field.type)} step={field.type === "decimal" || field.type === "currency" ? "0.01" : field.whole ? 1 : undefined}
        min={limits?.min} max={limits?.max} inputMode={field.whole ? "numeric" : undefined}
        className={base} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} {...a11y} />;
  }
}

/** Label + control + inline error. Groups (radio / checkbox sets) get a text label tied to the
 *  group, not a <label> — a <label> around several inputs makes clicking the question toggle the
 *  first option, and checkbox fields previously showed no question text at all. */
function Question({ field, id, label, error, className = "", children }: { field: FormField; id: string; label?: string; error?: string; className?: string; children: React.ReactNode }) {
  const star = field.required ? <span className="text-primary"> *</span> : null;
  const grouped = GROUP_TYPES.includes(field.type);
  return (
    <div className={`flex flex-col gap-1.5 text-[15px] ${className}`}>
      {grouped
        ? <span id={`${id}-label`} className="font-medium text-ink">{label ?? field.label}{star}</span>
        : <label htmlFor={id} className="font-medium text-ink">{label ?? field.label}{star}</label>}
      {children}
      {error ? <p id={`${id}-err`} role="alert" className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

function Subform({ field, id, rows, errors, count, values, resolved, onChange, onNumberBlur }: {
  field: FormField; id: string; rows: Row[]; errors: Errors; count?: number; values: Values; resolved: Resolved; onChange: (rows: Row[]) => void; onNumberBlur: (id: string, f: FormField, v: string, lim: Limits) => void;
}) {
  const subfields = field.subfields ?? [];
  const fixed = count !== undefined; // the number of entries follows an earlier answer
  const canAddMore = !fixed && (!field.max || rows.length < field.max);
  const addRow = () => onChange([...rows, {}]);
  const removeRow = (i: number) => onChange(rows.filter((_, j) => j !== i));
  const setCell = (i: number, key: string, v: string) => onChange(rows.map((r, j) => (j === i ? { ...r, [key]: v } : r)));
  const title = (i: number) => pipe(field.entry_label || `${field.label} {n}`, values, resolved, { n: String(i + 1), count: String(rows.length) });

  return (
    <div className="flex flex-col gap-3 sm:col-span-2" role="group" aria-labelledby={`${id}-label`}>
      <div id={`${id}-label`} className="text-sm font-medium">{pipe(field.label, values, resolved)}{field.required && !fixed ? <span className="text-primary"> *</span> : null}</div>
      {rows.map((row, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-xl border border-line p-4">
          {fixed ? <div className="text-base font-semibold">{title(i)}</div> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {subfields.map((sf) => {
              const cellId = `${id}.${i}.${sf.key}`;
              return (
                <Question key={sf.key} field={sf} id={cellId} label={pipe(sf.label, values, resolved, { n: String(i + 1), count: String(rows.length) })} error={errors[cellId]} className={sf.span === 2 ? "sm:col-span-2" : ""}>
                  <BasicField field={sf} id={cellId} value={row[sf.key] ?? ""} onChange={(v) => setCell(i, sf.key, v)} onBlur={() => onNumberBlur(cellId, sf, row[sf.key] ?? "", { min: sf.min_value, max: sf.max_value })} error={errors[cellId]} limits={{ min: sf.min_value, max: sf.max_value }} />
                </Question>
              );
            })}
          </div>
          {!fixed ? <button type="button" onClick={() => removeRow(i)} className="self-start text-sm text-red-700">Remove</button> : null}
        </div>
      ))}
      {errors[id] ? <p id={`${id}-err`} role="alert" className="text-sm text-red-700">{errors[id]}</p> : null}
      {canAddMore ? (
        <button type="button" onClick={addRow} aria-invalid={errors[id] ? true : undefined} className="btn self-start border-dashed">+ {field.repeat_label || "Add another"}</button>
      ) : null}
    </div>
  );
}

function SectionBlock({ section, active, values, errors, resolved, onFieldChange, onNumberBlur }: {
  section: FormSection; active: boolean; values: Values; errors: Errors; resolved: Resolved; onFieldChange: (id: string, v: Value) => void; onNumberBlur: (id: string, f: FormField, v: string, lim: Limits) => void;
}) {
  const shown = section.fields.filter((f) => resolved.visible.has(uid(section.id, f.key)));
  if (!shown.length) return null; // nothing in this section applies yet — don't show a lone heading
  // `hidden` (not unmounting) keeps entered values intact when navigating back in a paginated form.
  // Validation is our own (see fieldError), so hidden steps can never block Next or Submit.
  return (
    <div hidden={!active} role="group" aria-label={section.heading} className={`flex flex-col gap-4 ${section.background ? "rounded-2xl p-6" : ""}`} style={section.background ? { background: section.background } : undefined}>
      {section.heading ? <div className="border-b border-line pb-2.5 text-lg font-semibold">{section.heading}</div> : null}
      <div className={`grid gap-4 ${section.columns === 2 ? "sm:grid-cols-2" : ""}`}>
        {shown.map((f) => {
          const id = uid(section.id, f.key);
          if (f.type === "subform") {
            const count = repeatCount(f, values, resolved);
            if (count === 0) return null; // size follows an answer that isn't a positive number yet
            return <Subform key={id} field={f} id={id} rows={rowsFor(values[id] as Row[] | undefined, count)} count={count} errors={errors} values={values} resolved={resolved} onChange={(rows) => onFieldChange(id, rows)} onNumberBlur={onNumberBlur} />;
          }
          return (
            <Question key={id} field={f} id={id} label={pipe(f.label, values, resolved)} error={errors[id]} className={f.span === 2 || section.columns === 1 ? "sm:col-span-2" : ""}>
              <BasicField field={f} id={id} value={typeof values[id] === "string" ? (values[id] as string) : ""} onChange={(v) => onFieldChange(id, v)} onBlur={() => onNumberBlur(id, f, typeof values[id] === "string" ? (values[id] as string) : "", limitsFor(f, values, resolved))} error={errors[id]} limits={limitsFor(f, values, resolved)} />
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
  // Which questions apply right now (conditional questions, and everything that depended on a hidden one).
  const resolved = resolve(sections, values);
  const hasShown = (sec: FormSection) => sec.fields.some((f) => resolved.visible.has(uid(sec.id, f.key)));
  // Steps are the sections that currently have something to answer — a step whose questions are all
  // conditional and not triggered is skipped (and the "Step x of y" count follows).
  const stepSections = sections.map((sec, i) => (hasShown(sec) ? i : -1)).filter((i) => i >= 0);
  const paginated = !!form.paginate && stepSections.length > 1;
  const curStep = Math.min(step, Math.max(stepSections.length - 1, 0));
  const lastStep = curStep === stepSections.length - 1;
  const activeSection = stepSections[curStep];

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

  // A number is checked the moment the person leaves it (only when something is typed — so tabbing
  // through blanks doesn't flash "required" everywhere). Submit/Next still check everything.
  const onNumberBlur = (id: string, f: FormField, v: string, lim: Limits) => {
    if (!NUMERIC_TYPES.includes(f.type) || !v.trim()) return;
    const e = fieldError(f, v, lim);
    setErrors((prev) => {
      if (!e) { if (!(id in prev)) return prev; const n = { ...prev }; delete n[id]; return n; }
      return prev[id] === e ? prev : { ...prev, [id]: e };
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
  }, [curStep]);

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
    const errs = sectionErrors(sections[activeSection], values, resolved);
    if (Object.keys(errs).length) { setErrors((prev) => ({ ...prev, ...errs })); setFocusTick((t) => t + 1); return; }
    setStep(Math.min(curStep + 1, stepSections.length - 1));
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
      const errs = sectionErrors(sec, values, resolved);
      if (Object.keys(errs).length) { Object.assign(all, errs); if (firstBad < 0) firstBad = i; }
    });
    if (firstBad >= 0) {
      setErrors(all);
      if (paginated) setStep(Math.max(stepSections.indexOf(firstBad), 0));
      setFocusTick((t) => t + 1);
      return;
    }

    setState("sending"); setError("");

    // Flatten to plain question keys for the lead pipeline — only questions that applied (a hidden
    // question's leftover answer is not sent). If two questions share a key, the later ones are saved
    // as key_2, key_3… so no answer overwrites another.
    const flat: Record<string, Value> = {};
    const seen: Record<string, number> = {};
    for (const sec of sections) for (const f of sec.fields) {
      const id = uid(sec.id, f.key);
      if (!resolved.visible.has(id)) continue;
      let v = values[id];
      if (f.type === "subform") {
        const count = repeatCount(f, values, resolved);
        if (count === 0) continue;
        v = rowsFor(v as Row[] | undefined, count); // exactly the entries that were shown
      }
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

  // Errors on the questions currently on screen (for the summary line).
  const onScreen = new Set(sections.filter((_, i) => !paginated || i === activeSection).map((sec) => sec.id));
  const shownErrors = Object.keys(errors).filter((k) => {
    const top = k.split(".")[0];
    return resolved.visible.has(top) && onScreen.has(top.split("__")[0]);
  }).length;

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="flex scroll-mt-24 flex-col gap-6">
      {/* Spam trap: invisible to people, filled in by bots. Deliberately NOT named "website" — browsers and password managers autofill that, and a filled trap makes the server drop the lead. */}
      <input type="text" name="contact_extra" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      {paginated ? (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted" aria-live="polite">Step {curStep + 1} of {stepSections.length}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-soft">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((curStep + 1) / stepSections.length) * 100}%` }} />
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-8">
        {sections.map((section, i) => (
          <SectionBlock key={section.id} section={section} active={!paginated || i === activeSection} values={values} errors={errors} resolved={resolved} onFieldChange={set} onNumberBlur={onNumberBlur} />
        ))}
      </div>

      {shownErrors ? <p className="text-sm font-medium text-red-700" role="alert">Please complete the {shownErrors === 1 ? "highlighted question" : `${shownErrors} highlighted questions`} to continue.</p> : null}
      {state === "error" ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}

      {paginated ? (
        <div className="flex gap-3">
          {curStep > 0 ? <button type="button" onClick={() => setStep(curStep - 1)} className="btn h-13 flex-1">Back</button> : null}
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
