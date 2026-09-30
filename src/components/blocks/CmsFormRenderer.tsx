"use client";
import { useEffect, useRef, useState } from "react";
import type { CmsForm, FormField, FormSection } from "@/lib/types";
import { buildSteps, entryBounds, isEmptyRow, limitsFor, NUMERIC_TYPES, paginatedEntryField, pipe, repeatCount, resolve, uid, type Resolved, type Row, type Step, type Value, type Values } from "@/lib/formLogic";

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
  if (f.type === "heading") return null; // not a question — nothing to validate, ever
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
      // Free/bounded mode WITH per-entry pagination: an untouched trailing "add another?" slot is not
      // a real entry yet, so it's excluded here — leaving it blank just means "no more". A plain
      // "+ Add another" row (not paginated) was an explicit action and is always validated normally.
      const rows = count !== undefined ? rowsFor(values[id] as Row[] | undefined, count)
        : f.paginate_entries ? ((values[id] as Row[] | undefined) ?? []).filter((row) => !isEmptyRow(f, row))
        : ((values[id] as Row[] | undefined) ?? []);
      if (count === undefined) {
        const min = entryBounds(f, values, r).min ?? (f.required ? 1 : 0);
        if (rows.length < min) out[id] = min === 1 ? "Please add at least 1 entry." : `Please add at least ${min} entries.`;
      }
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


/** One selectable row in the "boxed" choice style: a custom radio/checkmark, the option text, the
 *  whole row clickable, and the row itself highlights when selected — matching the reference design,
 *  but colored from the theme (var(--fq-accent)) instead of a hardcoded blue. */
function BoxChoice({ kind, label, checked, onClick, inputProps }: { kind: "radio" | "check"; label: React.ReactNode; checked: boolean; onClick: () => void; inputProps: Record<string, unknown> }) {
  return (
    <label className={`flex min-h-[52px] cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 text-[15px] leading-relaxed transition-colors ${checked ? "border-[var(--fq-accent)] bg-[var(--fq-accent-soft)]" : "border-[var(--fq-line)] bg-[var(--fq-surface)] hover:border-[var(--fq-accent)]"}`}>
      <input type={kind === "radio" ? "radio" : "checkbox"} checked={checked} onChange={onClick} className="sr-only" {...inputProps} />
      <span aria-hidden className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center border-[1.5px] ${kind === "radio" ? "rounded-full" : "rounded-[5px]"} ${checked ? "border-0 bg-[var(--fq-accent)]" : "border-[var(--fq-choice-border)]"}`}>
        {checked && kind === "radio" ? <span className="h-[9px] w-[9px] rounded-full bg-white" /> : null}
        {checked && kind === "check" ? (
          <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3 3 7-7" /></svg>
        ) : null}
      </span>
      <span className="text-[var(--fq-ink)]">{label}</span>
    </label>
  );
}

/** A compact pill button for a choice option — side by side, not stacked full-width rows — for short
 *  options like Yes/No or Full-Time/Part-Time, matching the approved template mockup. */
function PillChoice({ label, checked, onClick, inputProps }: { label: React.ReactNode; checked: boolean; onClick: () => void; inputProps: Record<string, unknown> }) {
  return (
    <label className={`flex h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-[14px] font-medium transition-colors ${checked ? "border-[var(--fq-accent)] bg-[var(--fq-accent-soft)] text-[var(--fq-ink)]" : "border-[var(--fq-choice-border)] bg-[var(--fq-surface)] text-[var(--fq-ink)] hover:border-[var(--fq-accent)]"}`}>
      <input onChange={onClick} checked={checked} className="sr-only" {...inputProps} />
      <span aria-hidden className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] ${checked ? "border-0 bg-[var(--fq-accent)]" : "border-[var(--fq-choice-border)]"}`}>
        {checked ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
      </span>
      {label}
    </label>
  );
}

function BasicField({ field, id, value, onChange, onBlur, error, limits, boxed, pills }: { field: FormField; id: string; value: string; onChange: (v: string) => void; onBlur?: () => void; error?: string; limits?: Limits; boxed?: boolean; pills?: boolean }) {
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
      if (pills) return (
        <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex flex-wrap gap-2 pt-1">
          {(field.options ?? []).map((o) => <PillChoice key={o} label={o} checked={value === o} onClick={() => onChange(o)} inputProps={{ type: "radio", name: id, value: o, ...a11y }} />)}
        </div>
      );
      return boxed ? (
        <div role="radiogroup" aria-labelledby={`${id}-label`} className="grid gap-2.5">
          {(field.options ?? []).map((o) => <BoxChoice key={o} kind="radio" label={o} checked={value === o} onClick={() => onChange(o)} inputProps={{ name: id, value: o, ...a11y }} />)}
        </div>
      ) : (
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
      const toggle = (o: string) => onChange(selected.includes(o) ? selected.filter((s) => s !== o).join(",") : [...selected, o].join(","));
      if (pills) return (
        <div role="group" aria-labelledby={`${id}-label`} className="flex flex-wrap gap-2 pt-1">
          {(field.options ?? []).map((o) => <PillChoice key={o} label={o} checked={selected.includes(o)} onClick={() => toggle(o)} inputProps={{ type: "checkbox", ...a11y }} />)}
        </div>
      );
      return boxed ? (
        <div role="group" aria-labelledby={`${id}-label`} className="grid gap-2.5">
          {(field.options ?? []).map((o) => <BoxChoice key={o} kind="check" label={o} checked={selected.includes(o)} onClick={() => toggle(o)} inputProps={a11y} />)}
        </div>
      ) : (
        <div role="group" aria-labelledby={`${id}-label`} className="flex flex-wrap gap-4 pt-1.5">
          {(field.options ?? []).map((o) => (
            <label key={o} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={selected.includes(o)} {...a11y} onChange={() => toggle(o)} /> {o}
            </label>
          ))}
        </div>
      );
    }
    case "checkbox":
      // Boxed/Pills style: the whole statement is the clickable row (not a separate heading plus a
      // generic "Yes" box) — Question skips its own heading for this type, see below.
      if (pills) return <PillChoice label={<>{field.label}{field.required ? <span className="text-[var(--fq-accent)]"> *</span> : null}</>} checked={value === "yes"} onClick={() => onChange(value === "yes" ? "" : "yes")} inputProps={a11y} />;
      return boxed ? (
        <BoxChoice kind="check" label={<>{field.label}{field.required ? <span className="text-[var(--fq-accent)]"> *</span> : null}</>} checked={value === "yes"} onClick={() => onChange(value === "yes" ? "" : "yes")} inputProps={a11y} />
      ) : (
        // The whole statement is the clickable target — a <span> above (see soloCheckbox) has no
        // native label behavior, so a long consent sentence needs to live INSIDE this <label> to be
        // clickable anywhere, not just on a lone "Yes" underneath it.
        <label className="flex items-start gap-2 text-sm">
          <input id={id} type="checkbox" checked={value === "yes"} onChange={(e) => onChange(e.target.checked ? "yes" : "")} className="mt-0.5" {...a11y} />
          <span>{field.label}{field.required ? <span className="text-[var(--fq-accent)]"> *</span> : null}</span>
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
function Question({ field, id, label, error, className = "", boxed, pills, children }: { field: FormField; id: string; label?: string; error?: string; className?: string; boxed?: boolean; pills?: boolean; children: React.ReactNode }) {
  const star = field.required ? <span className="text-[var(--fq-accent)]"> *</span> : null;
  const grouped = GROUP_TYPES.includes(field.type);
  const soloCheckbox = field.type === "checkbox"; // its own clickable row already states the question — see BasicField, every style
  return (
    <div className={`flex flex-col gap-2.5 text-[15px] ${boxed ? "rounded-2xl border border-[var(--fq-line)] bg-[var(--fq-surface)] p-5 shadow-[var(--fq-shadow)] md:p-6" : "gap-1.5"} ${className}`}>
      {soloCheckbox ? null : grouped
        ? <span id={`${id}-label`} className={`${boxed ? "text-base font-bold" : "font-medium"} text-[var(--fq-ink)]`}>{label ?? field.label}{star}</span>
        : <label htmlFor={id} className={`${boxed ? "text-base font-bold" : "font-medium"} text-[var(--fq-ink)]`}>{label ?? field.label}{star}</label>}
      {children}
      {error ? <p id={`${id}-err`} role="alert" className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

function Subform({ field, id, rows, errors, count, values, resolved, boxed, pills, onlyIndex, onChange, onNumberBlur }: {
  field: FormField; id: string; rows: Row[]; errors: Errors; count?: number; values: Values; resolved: Resolved; boxed?: boolean; pills?: boolean;
  /** Per-entry pagination: render just this one entry (its own step) instead of the whole list. */
  onlyIndex?: number;
  onChange: (rows: Row[]) => void; onNumberBlur: (id: string, f: FormField, v: string, lim: Limits) => void;
}) {
  const subfields = field.subfields ?? [];
  const fixed = count !== undefined; // the number of entries follows an earlier answer
  const bounds = fixed ? {} : entryBounds(field, values, resolved);
  const canAddMore = !fixed && onlyIndex === undefined && (bounds.max === undefined || rows.length < bounds.max);
  const canRemove = bounds.min === undefined || rows.length > bounds.min;
  const addRow = () => onChange([...rows, {}]);
  const removeRow = (i: number) => onChange(rows.filter((_, j) => j !== i));
  // Extends the array if needed — typing into the trailing "add another?" slot (one past the last
  // real entry) has to be able to create that entry, not silently do nothing.
  const setCell = (i: number, key: string, v: string) => {
    const next = rows.slice();
    while (next.length <= i) next.push({});
    next[i] = { ...next[i], [key]: v };
    onChange(next);
  };
  const title = (i: number) => pipe(field.entry_label || `${field.label} {n}`, values, resolved, { n: String(i + 1), count: String(rows.length) });

  const indices = onlyIndex === undefined ? rows.map((_, i) => i) : [onlyIndex];
  return (
    <div className="flex flex-col gap-3 sm:col-span-2" role="group" aria-labelledby={`${id}-label`}>
      {onlyIndex === undefined ? <div id={`${id}-label`} className="text-sm font-medium text-[var(--fq-ink)]">{pipe(field.label, values, resolved)}{field.required && !fixed ? <span className="text-[var(--fq-accent)]"> *</span> : null}</div> : null}
      {indices.map((i) => {
        const row = rows[i] ?? {};
        const isTrailingSlot = onlyIndex !== undefined && !fixed && i >= rows.length;
        const entry = (
          <div key={i} className={(boxed || pills) ? "flex flex-col gap-4" : "flex flex-col gap-3 rounded-xl border border-[var(--fq-line)] p-4"}>
            {fixed && !boxed ? <div className="text-base font-semibold text-[var(--fq-ink)]">{title(i)}</div> : null}
            {isTrailingSlot ? <p className="text-sm text-muted">Fill this in to add another — or leave it blank and continue.</p> : null}
            <div className={`grid gap-3 sm:grid-cols-2 ${(boxed || pills) ? "gap-4" : ""}`}>
              {subfields.map((sf) => {
                const cellId = `${id}.${i}.${sf.key}`;
                if (sf.type === "heading") {
                  return <h4 key={sf.key} className="col-span-full border-b border-[var(--fq-line)] pb-1.5 pt-0.5 text-base font-semibold text-[var(--fq-ink)] first:pt-0">{pipe(sf.label, values, resolved, { n: String(i + 1), count: String(rows.length) })}</h4>;
                }
                return (
                  <Question key={sf.key} field={sf} id={cellId} label={pipe(sf.label, values, resolved, { n: String(i + 1), count: String(rows.length) })} error={errors[cellId]} className={sf.span === 2 ? "sm:col-span-2" : ""} boxed={boxed} pills={pills}>
                    <BasicField field={sf} id={cellId} value={row[sf.key] ?? ""} onChange={(v) => setCell(i, sf.key, v)} onBlur={() => onNumberBlur(cellId, sf, row[sf.key] ?? "", { min: sf.min_value, max: sf.max_value })} error={errors[cellId]} limits={{ min: sf.min_value, max: sf.max_value }} boxed={boxed} pills={pills} />
                  </Question>
                );
              })}
            </div>
            {!fixed && canRemove && (onlyIndex === undefined || onlyIndex < rows.length) ? <button type="button" onClick={() => removeRow(i)} className="self-start text-sm text-red-700">Remove</button> : null}
          </div>
        );
        return (boxed || pills)
          ? <div key={i} className="rounded-2xl border border-l-4 border-[var(--fq-line)] bg-[var(--fq-surface)] p-5 shadow-[var(--fq-shadow)] md:p-6" style={{ borderLeftColor: "var(--fq-accent)" }}>
              {fixed ? <div className="mb-4 text-base font-bold text-[var(--fq-ink)]">{title(i)}</div> : null}
              {entry}
            </div>
          : entry;
      })}
      {errors[id] ? <p id={`${id}-err`} role="alert" className="text-sm text-red-700">{errors[id]}</p> : null}
      {canAddMore ? (
        <button type="button" onClick={addRow} aria-invalid={errors[id] ? true : undefined} className="btn self-start border-dashed">+ {field.repeat_label || "Add another"}</button>
      ) : null}
      {!fixed && bounds.max !== undefined && rows.length >= bounds.max ? <p className="text-xs text-muted">Maximum of {bounds.max} reached.</p> : null}
    </div>
  );
}

function SectionBlock({ section, active, values, errors, resolved, boxed, pills, onlyEntry, only, headingSize, onFieldChange, onNumberBlur }: {
  section: FormSection; active: boolean; values: Values; errors: Errors; resolved: Resolved; boxed?: boolean; pills?: boolean;
  /** The sidebar layout wants a large, prominent in-content heading (matching the approved mock) —
   *  everywhere else keeps the smaller inline heading. */
  headingSize?: "default" | "large";
  /** This section is showing as one step per subform entry — render just this entry's fields (and
   *  nothing from the rest of the section — those got their own step already, see `only` below). */
  onlyEntry?: { fieldKey: string; entryIndex: number };
  /** This step is the "other questions" step of a section that also holds a paginated subform —
   *  render only these keys, so the subform (which gets its own entry steps) isn't repeated here. */
  only?: string[];
  onFieldChange: (id: string, v: Value) => void; onNumberBlur: (id: string, f: FormField, v: string, lim: Limits) => void;
}) {
  const shown = section.fields.filter((f) =>
    resolved.visible.has(uid(section.id, f.key)) && (onlyEntry ? f.key === onlyEntry.fieldKey : !only || only.includes(f.key)));
  if (!shown.length) return null; // nothing in this section applies yet — don't show a lone heading
  // `hidden` (not unmounting) keeps entered values intact when navigating back in a paginated form.
  // Validation is our own (see fieldError), so hidden steps can never block Next or Submit.
  return (
    <div hidden={!active} role="group" aria-label={section.heading} className={`flex flex-col gap-4 ${section.background && !boxed ? "rounded-2xl p-6" : ""}`} style={section.background && !boxed ? { background: section.background } : undefined}>
      {section.heading && !onlyEntry ? (
        headingSize === "large"
          ? <h2 className="text-3xl font-bold leading-tight text-[var(--fq-ink)]">{section.heading}</h2>
          : <div className="border-b border-[var(--fq-line)] pb-2.5 text-lg font-semibold text-[var(--fq-ink)]">{section.heading}</div>
      ) : null}
      <div className={`grid gap-4 ${section.columns === 2 && !onlyEntry ? "sm:grid-cols-2" : ""}`}>
        {shown.map((f) => {
          const id = uid(section.id, f.key);
          if (f.type === "heading") {
            // Not a question — a plain text header with an underline, breaking a long section into
            // labeled parts. Always full width, regardless of the section's column count.
            return <h3 key={id} className="col-span-full border-b border-[var(--fq-line)] pb-2 pt-1 text-lg font-semibold text-[var(--fq-ink)] first:pt-0">{pipe(f.label, values, resolved)}</h3>;
          }
          if (f.type === "subform") {
            const count = repeatCount(f, values, resolved);
            if (count === 0) return null; // size follows an answer that isn't a positive number yet
            return <Subform key={id} field={f} id={id} rows={rowsFor(values[id] as Row[] | undefined, count)} count={count} errors={errors} values={values} resolved={resolved} boxed={boxed} pills={pills}
              onlyIndex={onlyEntry?.fieldKey === f.key ? onlyEntry.entryIndex : undefined}
              onChange={(rows) => onFieldChange(id, rows)} onNumberBlur={onNumberBlur} />;
          }
          return (
            <Question key={id} field={f} id={id} label={pipe(f.label, values, resolved)} error={errors[id]} className={f.span === 2 || section.columns === 1 ? "sm:col-span-2" : ""} boxed={boxed} pills={pills}>
              <BasicField field={f} id={id} value={typeof values[id] === "string" ? (values[id] as string) : ""} onChange={(v) => onFieldChange(id, v)} onBlur={() => onNumberBlur(id, f, typeof values[id] === "string" ? (values[id] as string) : "", limitsFor(f, values, resolved))} error={errors[id]} limits={limitsFor(f, values, resolved)} boxed={boxed} pills={pills} />
            </Question>
          );
        })}
      </div>
    </div>
  );
}

export function CmsFormRenderer({ form, pageId, extraFields, secondaryAction }: { form: CmsForm; pageId?: string;
  /** Fixed context to attach to the submission without asking the person a question for it — e.g.
   *  which listing an inquiry form was opened from. Merged into custom_fields, added after the
   *  form's own answers so a real question with the same key always wins. */
  extraFields?: Record<string, unknown>;
  /** An extra action shown beside Submit on a non-paginated form's single button row (e.g. "Call
   *  now" next to a listing inquiry's "Request info") — not shown on a paginated form's steps,
   *  where the row already has Back/Next. */
  secondaryAction?: { label: string; href: string };
}) {
  const [values, setValues] = useState<Values>({});
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const [navOpen, setNavOpen] = useState(false); // mobile-only: the sidebar nav list starts collapsed there
  const [focusTick, setFocusTick] = useState(0);
  const started = useRef(Date.now());
  const formRef = useRef<HTMLFormElement>(null);
  const firstRender = useRef(true);

  const sections = form.sections ?? [];
  const boxed = form.choice_style === "boxed";
  const pills = form.choice_style === "pills";
  const dark = form.theme === "dark";
  // Scoped to this form (not the page's own light/dark), and colored from the site's own brand
  // color rather than a fixed blue, so "boxed" looks right on any client's theme.
  const themeVars: React.CSSProperties = dark
    ? { "--fq-ink": "#F6F7FA", "--fq-surface": "#171A21", "--fq-line": "#323744", "--fq-choice-border": "#4B5563",
        "--fq-accent": "var(--color-primary)", "--fq-accent-soft": "color-mix(in srgb, var(--color-primary) 24%, #171A21)",
        "--fq-shadow": "0 10px 28px rgba(0,0,0,.35)", background: "#0E1015", color: "#F6F7FA" } as React.CSSProperties
    : { "--fq-ink": "var(--color-ink, #14142B)", "--fq-surface": "#FFFFFF", "--fq-line": "var(--color-line, #E5E7EB)", "--fq-choice-border": "#AAB1BC",
        "--fq-accent": "var(--color-primary)", "--fq-accent-soft": "color-mix(in srgb, var(--color-primary) 10%, white)",
        "--fq-shadow": "0 8px 24px rgba(16,24,40,.06)" } as React.CSSProperties;

  // Which questions currently apply (conditional questions, and everything that depended on a
  // hidden one), and — when paginated — the step list, exploding a per-entry-paginated subform
  // into one step per entry instead of one long page.
  const resolved = resolve(sections, values);
  const steps: Step[] = form.paginate ? buildSteps(sections, values, resolved) : [];
  const paginated = form.paginate && steps.length > 1;
  const curStep = Math.min(step, Math.max(steps.length - 1, 0));
  const lastStep = curStep === steps.length - 1;
  const activeStep = steps[curStep];

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
  }, [curStep]);

  // After a failed Next/Submit, move to the first question that needs attention.
  useEffect(() => {
    if (!focusTick) return;
    const el = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    el?.focus({ preventScroll: true });
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focusTick]);

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

  if (form.embed_html) {
    // Admin/editor-authored embed (e.g. Zoho) — same trust boundary as other admin HTML in this CMS.
    return <div dangerouslySetInnerHTML={{ __html: form.embed_html }} />;
  }

  // Errors that belong to ONE step: the whole section normally, or — on an entry step — just that
  // one entry's cells (so Next on entry 1 of 4 can't be blocked by entry 3 not existing yet).
  function stepErrors(st: Step): Errors {
    const sec = sections[st.sectionIndex];
    if (st.kind === "section") {
      // A section split by a paginated subform: this step only covers the OTHER questions (the
      // subform's own entries are validated on their own steps) — checking the whole section here
      // would wrongly demand answers for entries the person hasn't reached yet.
      const all = sectionErrors(sec, values, resolved);
      if (!st.only) return all;
      const out: Errors = {};
      for (const [k, v] of Object.entries(all)) if (st.only.some((key) => k === uid(sec.id, key))) out[k] = v;
      return out;
    }
    const f = sec.fields.find((x) => x.key === st.fieldKey)!;
    const id = uid(sec.id, f.key);
    const row = (values[id] as Row[] | undefined)?.[st.entryIndex] ?? {};
    // Free/bounded mode: leaving the trailing "add another?" entry untouched isn't an error — it
    // just means they're done adding, exactly like never clicking "Add another" in the first place.
    if (!f.repeat_from && isEmptyRow(f, row)) return {};
    const out: Errors = {};
    for (const sf of f.subfields ?? []) {
      const e = fieldError(sf, row[sf.key], { min: sf.min_value, max: sf.max_value });
      if (e) out[`${id}.${st.entryIndex}.${sf.key}`] = e;
    }
    return out;
  }

  function goNext() {
    const errs = stepErrors(activeStep);
    if (Object.keys(errs).length) { setErrors((prev) => ({ ...prev, ...errs })); setFocusTick((t) => t + 1); return; }
    setStep(Math.min(curStep + 1, steps.length - 1));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "sending") return;
    if (paginated && !lastStep) { goNext(); return; }

    // Check every section (not just the visible one) so nothing can be skipped; if a problem is on
    // an earlier step, go back to it.
    const all: Errors = {};
    let firstBadStep = -1;
    sections.forEach((sec, i) => {
      const errs = sectionErrors(sec, values, resolved);
      if (Object.keys(errs).length) {
        Object.assign(all, errs);
        if (firstBadStep < 0) firstBadStep = steps.findIndex((st) => st.sectionIndex === i);
      }
    });
    if (Object.keys(all).length) {
      setErrors(all);
      if (paginated) setStep(Math.max(firstBadStep, 0));
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
        // Fixed count: exactly the entries that were shown. Free/bounded with pagination: exclude the
        // untouched trailing "add another?" slot. Plain free/bounded: every explicitly-added row.
        v = count !== undefined ? rowsFor(v as Row[] | undefined, count)
          : f.paginate_entries ? ((v as Row[] | undefined) ?? []).filter((row) => !isEmptyRow(f, row))
          : ((v as Row[] | undefined) ?? []);
      }
      if (v === undefined) continue;
      let key = f.key;
      if (key in flat) { seen[f.key] = (seen[f.key] ?? 1) + 1; key = `${f.key}_${seen[f.key]}`; }
      flat[key] = v;
    }
    const str = (k: string) => (typeof flat[k] === "string" ? (flat[k] as string) : "");
    const name = [str("first_name"), str("last_name")].filter(Boolean).join(" ") || str("name");
    // "sms_opt_in" is reserved, like first_name/email/phone: a consent checkbox using this exact key
    // sets the lead's real SMS-consent column (what compliance and the sender actually check), instead
    // of silently landing in custom_fields where it would never take effect.
    const contactKeys = new Set(["first_name", "last_name", "name", "email", "phone", "sms_opt_in"]);
    const customFields: Record<string, unknown> = { ...extraFields };
    for (const [k, v] of Object.entries(flat)) if (!contactKeys.has(k)) customFields[k] = v;
    // The spam-trap field. The server drops the submission if a bot filled it in.
    const honeypot = (formRef.current?.elements.namedItem("contact_extra") as HTMLInputElement | null)?.value ?? "";

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      // A missing/misconfigured env var used to reach the generic catch below and show "Something
      // went wrong" with nothing in the console pointing at why. This is the one failure that's
      // never the visitor's fault, so it says so plainly instead of guessing at a network problem.
      console.error("CmsFormRenderer: Supabase URL/anon key is not configured");
      setState("error"); setError("This form isn't fully set up yet. Please contact us another way.");
      return;
    }

    let res: Response | null = null;
    let networkError: unknown = null;
    try {
      res = await fetch(`${url}/functions/v1/submit-lead`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          name, email: str("email"), phone: str("phone"), sms_opt_in: flat.sms_opt_in === "yes",
          form_key: form.form_key,
          page_id: pageId,
          path: window.location.pathname,
          custom_fields: customFields,
          website: honeypot,
          elapsed_ms: Date.now() - started.current,
        }),
      });
    } catch (e) { networkError = e; }

    if (res?.ok) { setState("done"); return; }
    setState("error");
    if (networkError) {
      // fetch throws for an actual connectivity/CORS failure, not for a 4xx/5xx — those still reach
      // res.ok === false above with a real response to read the message from.
      console.error("CmsFormRenderer: submit-lead request failed", networkError);
      setError("Couldn't reach the server. Please check your connection and try again.");
      return;
    }
    const body = await res!.json().catch((e) => { console.error("CmsFormRenderer: submit-lead returned a non-JSON response", e); return null; });
    if (body?.error) setError(body.error);
    else { console.error("CmsFormRenderer: submit-lead failed with status", res!.status); setError(`Something went wrong (error ${res!.status}). Please try again.`); }
  }

  if (state === "done") {
    return <div className="rounded-2xl bg-white p-8 text-center" role="status"><p className="font-display text-2xl font-bold">{form.success_message}</p></div>;
  }

  // Errors on the questions currently on screen (for the summary line).
  // Which of the STATE errors (only ever set after a failed Next/Submit — see goNext/onSubmit) belong
  // to the step currently on screen. This must read the state, not re-run validation live — doing the
  // latter was the bug: an empty required field would show "please complete" on first paint, before
  // the person had done anything at all.
  function stepErrorKeys(st: Step): number {
    const sec = sections[st.sectionIndex];
    if (st.kind === "section") {
      const prefix = `${sec.id}__`;
      const allowed = st.only ? new Set(st.only.map((k) => uid(sec.id, k))) : null;
      return Object.keys(errors).filter((k) => k.startsWith(prefix) && (!allowed || allowed.has(k.split(".")[0]))).length;
    }
    const entryPrefix = `${uid(sec.id, st.fieldKey)}.${st.entryIndex}.`;
    return Object.keys(errors).filter((k) => k.startsWith(entryPrefix)).length;
  }
  const shownErrors = paginated ? stepErrorKeys(activeStep) : Object.keys(errors).length;
  const sidebar = form.layout === "sidebar";
  const stepLabel = activeStep?.kind === "entry"
    ? pipe(sections[activeStep.sectionIndex].fields.find((f) => f.key === activeStep.fieldKey)?.entry_label || "Entry {n} of {count}", values, resolved, { n: String(activeStep.entryIndex + 1), count: String(activeStep.total) })
    : sidebar ? undefined : sections[activeStep?.sectionIndex ?? 0]?.heading;

  // The left-panel nav, when using the "sidebar" layout: one entry per section that currently has
  // content, labeled from its own heading (falling back to "Step N") — literally the section headers
  // used as navigation, per the layout's whole point. Works whether the form paginates or not; when
  // it does, each entry also knows if it's done / current / upcoming so the sidebar can show progress.
  const navItems = sections
    .map((sec, i) => ({ i, label: sec.heading || "", shown: sec.fields.some((f) => resolved.visible.has(uid(sec.id, f.key))) }))
    .filter((n) => n.shown)
    .map((n, idx) => ({ ...n, label: n.label || `Step ${idx + 1}` }));
  const stepRangeFor = (sectionIndex: number) => {
    const idxs = steps.map((st, si) => (st.sectionIndex === sectionIndex ? si : -1)).filter((x) => x >= 0);
    return idxs.length ? { first: idxs[0], last: idxs[idxs.length - 1] } : null;
  };

  const formBody = (
    <form ref={formRef} onSubmit={onSubmit} noValidate style={themeVars} className="flex scroll-mt-24 flex-col gap-6 text-[var(--fq-ink)]">
      {/* Spam trap: invisible to people, filled in by bots. Deliberately NOT named "website" — browsers and password managers autofill that, and a filled trap makes the server drop the lead. */}
      <input type="text" name="contact_extra" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      {paginated ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted" aria-live="polite">Step {curStep + 1} of {steps.length}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-soft">
              <div className="h-full rounded-full bg-[var(--fq-accent)] transition-all" style={{ width: `${((curStep + 1) / steps.length) * 100}%` }} />
            </div>
          </div>
          {stepLabel ? <span className="text-xs font-medium text-muted">{stepLabel}</span> : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-8">
        {sections.map((section, i) => {
          if (!paginated) return <SectionBlock key={section.id} section={section} active values={values} errors={errors} resolved={resolved} boxed={boxed} pills={pills} headingSize={sidebar ? "large" : undefined} onFieldChange={set} onNumberBlur={onNumberBlur} />;
          // In a paginated form, a section that exploded into per-entry steps renders once per
          // matching step (all `hidden` except the one that's active), so Back/Next can move
          // between entries without losing what's on the other entries.
          const stepsForSection = steps.map((st, si) => ({ st, si })).filter(({ st }) => st.sectionIndex === i);
          if (!stepsForSection.length) return null;
          return stepsForSection.map(({ st, si }) => (
            <SectionBlock key={st.kind === "entry" ? `${section.id}:${st.entryIndex}` : section.id} section={section} active={si === curStep} values={values} errors={errors} resolved={resolved} boxed={boxed} pills={pills}
              onlyEntry={st.kind === "entry" ? { fieldKey: st.fieldKey, entryIndex: st.entryIndex } : undefined}
              only={st.kind === "section" ? st.only : undefined} headingSize={sidebar ? "large" : undefined}
              onFieldChange={set} onNumberBlur={onNumberBlur} />
          ));
        })}
      </div>

      {shownErrors ? <p className="text-sm font-medium text-red-700" role="alert">Please complete the {shownErrors === 1 ? "highlighted question" : `${shownErrors} highlighted questions`} to continue.</p> : null}
      {state === "error" ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}

      {paginated ? (
        <div className="flex flex-wrap justify-center gap-3">
          {curStep > 0 ? <button type="button" onClick={() => setStep(curStep - 1)} className="h-13 w-full rounded-full py-3.5 text-base font-medium text-white disabled:opacity-60 sm:w-48" style={{ background: "#0066cc" }}>Back</button> : null}
          <button type="submit" disabled={state === "sending"} className="h-13 w-full rounded-full py-3.5 text-base font-medium text-white disabled:opacity-60 sm:w-48" style={{ background: "#333333" }}>
            {lastStep ? (state === "sending" ? "Sending…" : form.submit_label) : "Next"}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-3">
          {secondaryAction ? (
            <a href={secondaryAction.href} className="flex h-13 w-full items-center justify-center rounded-full py-3.5 text-base font-medium text-white sm:w-48" style={{ background: "#0066cc" }}>
              {secondaryAction.label}
            </a>
          ) : null}
          <button type="submit" disabled={state === "sending"} className="h-13 w-full rounded-full py-3.5 text-base font-medium text-white disabled:opacity-60 sm:w-48" style={{ background: "#333333" }}>
            {state === "sending" ? "Sending…" : form.submit_label}
          </button>
        </div>
      )}
    </form>
  );

  if (!sidebar) return formBody;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[var(--fq-line,var(--color-line))] sm:flex-row" style={themeVars}>
      <aside className="flex shrink-0 flex-col gap-6 p-6 sm:w-[30%] sm:p-7" style={{ background: dark ? "#0E1015" : "var(--fq-ink)", color: dark ? "#F6F7FA" : "#fff" }}>
        {!form.hide_header ? (
          <div className="flex flex-col gap-3">
            {form.name ? <h2 className="text-3xl font-bold leading-tight">{form.name}</h2> : null}
            <span className="h-[3px] w-9 rounded-full" style={{ background: "var(--fq-accent)" }} />
            {form.description ? <p className="text-sm text-white/70">{form.description}</p> : null}
          </div>
        ) : null}
        {navItems.length > 1 ? (
          <>
            {/* Mobile only: the nav list can be long relative to a phone screen, so it's collapsed by
               default there and expands on request — desktop always shows it, no toggle needed. */}
            <button type="button" onClick={() => setNavOpen((o) => !o)} aria-expanded={navOpen}
              className="flex items-center justify-between text-sm font-medium text-white sm:hidden">
              Sections <span aria-hidden className="text-lg leading-none">{navOpen ? "−" : "+"}</span>
            </button>
            <nav aria-label="Form sections" className={`flex-col ${navOpen ? "flex" : "hidden"} sm:flex`}>
              {navItems.map((n, idx) => {
                const range = paginated ? stepRangeFor(n.i) : null;
                // A single-page form has no "current step" to point at — the nav is a plain table of
                // contents there, fully visible, rather than dimmed as if every section were still ahead.
                const state2: "done" | "current" | "upcoming" = !paginated ? "done" : !range ? "upcoming" : curStep > range.last ? "done" : curStep >= range.first ? "current" : "upcoming";
                return (
                  <div key={n.i} className={`flex items-center gap-3 border-t border-l-2 border-white/10 py-3 pl-3 first:border-t-0 ${state2 === "upcoming" ? "opacity-50" : ""}`}
                    style={state2 === "current" ? { borderLeftColor: "var(--fq-accent)" } : { borderLeftColor: "transparent" }}>
                    <span className="text-xs font-semibold" style={state2 === "current" ? { color: "var(--fq-accent)" } : { color: "rgba(255,255,255,.5)" }}>{String(idx + 1).padStart(2, "0")}</span>
                    <span className="text-sm" style={state2 === "current" ? { color: "var(--fq-accent)", fontWeight: 600 } : { color: "rgba(255,255,255,.8)" }}>{n.label}</span>
                  </div>
                );
              })}
            </nav>
          </>
        ) : null}
      </aside>
      <div className="bg-[var(--fq-surface,white)] p-6 sm:w-[70%] sm:p-8">{formBody}</div>
    </div>
  );
}
