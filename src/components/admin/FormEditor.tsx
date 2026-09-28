"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CONTACT_BLOCK_FIELDS } from "@/lib/types";
import type { CmsForm, FormConditionOp, FormField, FormFieldType, FormSection } from "@/lib/types";
import { brokenRefs, NUMERIC_TYPES, OPS_WITHOUT_VALUE, TOKEN_RE } from "@/lib/formLogic";
import { Spinner } from "./Spinner";

const FIELD_TYPES: FormFieldType[] = [
  "text", "email", "tel", "url", "textarea", "number", "decimal", "currency", "date",
  "dropdown", "radio", "checkbox", "multiple_choice", "address", "subform",
];
const HAS_OPTIONS: FormFieldType[] = ["dropdown", "radio", "multiple_choice"];
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const newField = (key: string): FormField => ({ key, label: "New field", type: "text" });

/** Next free `field_N` — checked against every key already in the form (or subform), not just the
 *  current section. The old per-section counter gave every section's first field the key `field_1`,
 *  so two questions shared one answer. */
function nextFieldKey(taken: Iterable<string>): string {
  const used = new Set(taken);
  let n = 1;
  while (used.has(`field_${n}`)) n++;
  return `field_${n}`;
}

/** Make every question key unique (across all sections; each repeatable group has its own space).
 *  Later duplicates become key_2, key_3… Returns what was renamed so the editor can say so. */
function dedupeKeys(sections: FormSection[]): { sections: FormSection[]; renamed: { from: string; to: string }[] } {
  const renamed: { from: string; to: string }[] = [];
  const unique = (key: string, used: Set<string>) => {
    const base = key || "field";
    if (!used.has(base)) { used.add(base); return base; }
    let n = 2;
    while (used.has(`${base}_${n}`)) n++;
    const to = `${base}_${n}`;
    used.add(to); renamed.push({ from: base, to });
    return to;
  };
  const seen = new Set<string>();
  const out = sections.map((sec) => ({
    ...sec,
    fields: sec.fields.map((f) => {
      const key = unique(f.key, seen);
      if (f.type !== "subform") return key === f.key ? f : { ...f, key };
      const subUsed = new Set<string>();
      const subfields = (f.subfields ?? []).map((sf) => { const k = unique(sf.key, subUsed); return k === sf.key ? sf : { ...sf, key: k }; });
      return { ...f, key, subfields };
    }),
  }));
  return { sections: out, renamed };
}

/** One row per option — avoids comma-splitting, so an option can contain a
 *  comma, spaces, anything — no parsing ambiguity. */
function OptionsEditor({ options, onChange }: { options: string[]; onChange: (o: string[]) => void }) {
  const setOption = (i: number, v: string) => onChange(options.map((o, j) => (j === i ? v : o)));
  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-ground p-2.5">
      <span className="text-xs text-muted">Options</span>
      {options.map((o, i) => (
        <div key={i} className="flex gap-2">
          <input className="input h-9" value={o} onChange={(e) => setOption(i, e.target.value)} placeholder={`Option ${i + 1}`} />
          <button type="button" aria-label="Remove option" onClick={() => onChange(options.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <button type="button" className="btn h-9 self-start border-dashed text-sm" onClick={() => onChange([...options, ""])}>+ Add option</button>
    </div>
  );
}

/** What a question can refer to in its logic: an earlier question's key, label, type and options. */
type QuestionRef = { key: string; label: string; type: FormFieldType; options?: string[] };
const toRef = (f: FormField): QuestionRef => ({ key: f.key, label: f.label, type: f.type, options: f.options });
const OPS: { value: FormConditionOp; label: string }[] = [
  { value: "answered", label: "is answered" },
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "doesn't equal" },
  { value: "greater_than", label: "is greater than" },
  { value: "less_than", label: "is less than" },
];
const askName = (q: QuestionRef) => (q.label || q.key).slice(0, 70);

function FieldRow({ field, showSpan, duplicate, earlier, problems, formPaginate, onRenameKey, onChange, onRemove }: {
  field: FormField; showSpan: boolean; duplicate?: boolean;
  /** Questions above this one, for logic. Absent for fields inside a repeatable group (they only get fixed limits). */
  earlier?: QuestionRef[]; problems?: string[];
  /** Whether the form itself is set to Paginate — a subform can only step through its entries when it does. */
  formPaginate?: boolean;
  /** Rename this question's key and everything that points at it. */
  onRenameKey?: (to: string) => void;
  onChange: (f: FormField) => void; onRemove: () => void;
}) {
  const [showSubBuilder, setShowSubBuilder] = useState(field.type === "subform");
  const labelRef = useRef<HTMLInputElement>(null);
  const [keyDraft, setKeyDraft] = useState(field.key);
  useEffect(() => setKeyDraft(field.key), [field.key]);

  const isNumeric = NUMERIC_TYPES.includes(field.type);
  const canLogic = !!earlier;
  const numericEarlier = (earlier ?? []).filter((q) => NUMERIC_TYPES.includes(q.type));
  const hasLogic = !!(field.show_if || field.max_from || field.repeat_from !== undefined || field.min_value !== undefined || field.max_value !== undefined || field.whole);
  const [logicOpen, setLogicOpen] = useState(hasLogic);
  const set = (patch: Partial<FormField>) => onChange({ ...field, ...patch });
  const num = (v: string) => (v === "" ? undefined : Number(v));

  // The key is committed when you leave the box (not per keystroke) so a rename can safely update
  // every question, condition and label that points at it.
  const commitKey = () => {
    const k = keyDraft.replace(/[^a-z0-9_]/gi, "_");
    if (!k) { setKeyDraft(field.key); return; }
    setKeyDraft(k);
    if (k === field.key) return;
    if (onRenameKey) onRenameKey(k); else set({ key: k });
  };
  const insertToken = (key: string) => {
    const el = labelRef.current, tok = `{${key}}`;
    const at = el?.selectionStart ?? field.label.length, end = el?.selectionEnd ?? at;
    set({ label: field.label.slice(0, at) + tok + field.label.slice(end) });
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(at + tok.length, at + tok.length); });
  };
  const source = field.show_if ? (earlier ?? []).find((q) => q.key === field.show_if!.field) : undefined;
  const setShowIf = (key: string) => set({ show_if: key ? { field: key, op: field.show_if?.op ?? "answered", value: field.show_if?.value } : undefined });
  const inList = (key: string | undefined) => !key || (earlier ?? []).some((q) => q.key === key);

  const summary = [field.show_if ? "conditional" : "", field.max_from ? "limit follows an answer" : "", field.repeat_from !== undefined ? "entries follow an answer" : ""].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line p-3">
      <div className="grid grid-cols-2 gap-2">
        <input ref={labelRef} className="input" placeholder="Label" value={field.label} onChange={(e) => set({ label: e.target.value })} />
        <select className="input" value={field.type} onChange={(e) => {
          const t = e.target.value as FormFieldType;
          // counts are whole numbers by default; other number types are unchanged
          set({ type: t, ...(t === "number" && field.whole === undefined ? { whole: true } : {}) });
          setShowSubBuilder(t === "subform");
        }}>
          {FIELD_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
        </select>
      </div>
      {canLogic && earlier!.length ? (
        <select className="input h-9 w-auto self-start text-xs" aria-label="Insert an earlier answer into the question text" value="" onChange={(e) => { if (e.target.value) insertToken(e.target.value); }}>
          <option value="">Insert an earlier answer into the question text…</option>
          {earlier!.map((q) => <option key={q.key} value={q.key}>{askName(q)}  →  {`{${q.key}}`}</option>)}
        </select>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <input className="input w-40" placeholder="Field key" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} onBlur={commitKey} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitKey(); } }} />
        <label className="flex shrink-0 items-center gap-1.5 text-sm">Required<input type="checkbox" checked={!!field.required} onChange={(e) => set({ required: e.target.checked })} /></label>
        {showSpan ? (
          <label className="flex shrink-0 items-center gap-1.5 text-sm">Full width<input type="checkbox" checked={field.span === 2} onChange={(e) => set({ span: e.target.checked ? 2 : 1 })} /></label>
        ) : null}
        {(canLogic || isNumeric) ? (
          <button type="button" aria-expanded={logicOpen} onClick={() => setLogicOpen((o) => !o)} className="shrink-0 text-sm font-medium text-primary">
            {canLogic ? "Logic & limits" : "Limits"}{hasLogic ? " •" : ""} {logicOpen ? "▾" : "▸"}
          </button>
        ) : null}
        <button type="button" className="ml-auto shrink-0 text-sm text-red-700" onClick={onRemove}>Remove</button>
      </div>
      {summary && !logicOpen ? <p className="text-xs text-muted">{summary}</p> : null}
      {duplicate ? <p className="text-xs text-red-700">Another question uses the key “{field.key}”, so their answers would clash. It will be renamed automatically when you save — or change it here.</p> : null}
      {(problems ?? []).map((m, i) => <p key={i} className="text-xs text-red-700">{m}</p>)}

      {logicOpen && (canLogic || isNumeric) ? (
        <div className="flex flex-col gap-3 rounded-lg bg-ground p-3">
          {canLogic ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">Show this question only when…</span>
              <div className="flex flex-wrap gap-2">
                <select className="input h-9 w-60" aria-label="Show only when this question" value={field.show_if?.field ?? ""} onChange={(e) => setShowIf(e.target.value)}>
                  <option value="">— always show —</option>
                  {!inList(field.show_if?.field) ? <option value={field.show_if!.field}>{field.show_if!.field} (not found above)</option> : null}
                  {earlier!.map((q) => <option key={q.key} value={q.key}>{askName(q)}</option>)}
                </select>
                {field.show_if ? (
                  <select className="input h-9 w-40" aria-label="Condition" value={field.show_if.op} onChange={(e) => set({ show_if: { ...field.show_if!, op: e.target.value as FormConditionOp } })}>
                    {OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : null}
                {field.show_if && !OPS_WITHOUT_VALUE.includes(field.show_if.op) ? (
                  source?.options?.length ? (
                    <select className="input h-9 w-44" aria-label="Value" value={field.show_if.value ?? ""} onChange={(e) => set({ show_if: { ...field.show_if!, value: e.target.value } })}>
                      <option value="">Choose…</option>
                      {source.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input className="input h-9 w-40" aria-label="Value" placeholder="value" value={field.show_if.value ?? ""} onChange={(e) => set({ show_if: { ...field.show_if!, value: e.target.value } })} />
                  )
                ) : null}
              </div>
              <span className="text-xs text-muted">It stays hidden (and isn't required or sent) until that answer is given. Hiding a question also hides everything that depends on it.</span>
            </div>
          ) : null}

          {isNumeric ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">Limits</span>
              <div className="flex flex-wrap items-center gap-2">
                <input className="input h-9 w-28" type="number" aria-label="Minimum" placeholder="Minimum" value={field.min_value ?? ""} onChange={(e) => set({ min_value: num(e.target.value) })} />
                <input className="input h-9 w-28" type="number" aria-label="Maximum" placeholder="Maximum" value={field.max_value ?? ""} onChange={(e) => set({ max_value: num(e.target.value) })} />
                {field.type === "number" ? <label className="flex items-center gap-1.5 text-sm">Whole numbers only<input type="checkbox" checked={!!field.whole} onChange={(e) => set({ whole: e.target.checked })} /></label> : null}
              </div>
              {canLogic ? (
                <label className="flex flex-wrap items-center gap-2 text-sm">No higher than the answer to
                  <select className="input h-9 w-60" aria-label="No higher than the answer to" value={field.max_from ?? ""} onChange={(e) => set({ max_from: e.target.value || undefined })}>
                    <option value="">— none —</option>
                    {!inList(field.max_from) ? <option value={field.max_from}>{field.max_from} (not found above)</option> : null}
                    {numericEarlier.map((q) => <option key={q.key} value={q.key}>{askName(q)}</option>)}
                  </select>
                </label>
              ) : null}
            </div>
          ) : null}

          {field.type === "subform" && canLogic ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">Number of entries</span>
              <div className="flex flex-wrap items-center gap-2">
                <select className="input h-9 w-72" aria-label="Number of entries" value={field.repeat_from !== undefined ? "answer" : "free"}
                  onChange={(e) => set({ repeat_from: e.target.value === "answer" ? (numericEarlier[0]?.key ?? "") : undefined })}>
                  <option value="free">People add as many as they need</option>
                  <option value="answer">Exactly as many as an earlier answer</option>
                </select>
                {field.repeat_from !== undefined ? (
                  <select className="input h-9 w-60" aria-label="Entries follow the answer to" value={field.repeat_from} onChange={(e) => set({ repeat_from: e.target.value })}>
                    <option value="">Choose a question…</option>
                    {!inList(field.repeat_from) ? <option value={field.repeat_from}>{field.repeat_from} (not found above)</option> : null}
                    {numericEarlier.map((q) => <option key={q.key} value={q.key}>{askName(q)}</option>)}
                  </select>
                ) : null}
              </div>
              {field.repeat_from !== undefined ? (
                <>
                  {!numericEarlier.length ? <span className="text-xs text-amber-700">Add a number question above this one first — it will say how many entries are needed.</span> : null}
                  <input className="input h-9" aria-label="Entry title" placeholder="Title of each entry, e.g. Working adult {n} of {count}" value={field.entry_label ?? ""} onChange={(e) => set({ entry_label: e.target.value || undefined })} />
                  <span className="text-xs text-muted">Entries appear automatically (no add/remove buttons). Use {"{n}"} for the entry number and {"{count}"} for how many. At most {field.max || 12} entries are ever shown — change “Max entries” below.</span>
                  {formPaginate ? (
                    <label className="flex items-center gap-2 text-sm">One entry per step (like the rest of a paginated form)
                      <input type="checkbox" checked={!!field.paginate_entries} onChange={(e) => set({ paginate_entries: e.target.checked || undefined })} />
                    </label>
                  ) : (
                    <span className="text-xs text-amber-700">Turn on “Paginate” for the whole form (in Details) to also step through these entries one at a time.</span>
                  )}
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {HAS_OPTIONS.includes(field.type) ? (
        <OptionsEditor options={field.options ?? []} onChange={(options) => set({ options })} />
      ) : null}
      {field.type === "subform" && showSubBuilder ? (
        <div className="flex flex-col gap-2 rounded-lg bg-ground p-3">
          <div className="flex flex-wrap gap-3">
            {field.repeat_from === undefined ? (
              <input className="input flex-1" placeholder={'"Add another…" button label'} value={field.repeat_label ?? ""} onChange={(e) => set({ repeat_label: e.target.value })} />
            ) : <span className="flex-1 self-center text-xs text-muted">Entries follow an earlier answer, so there is no “Add another” button.</span>}
            <input className="input w-28" type="number" min={1} placeholder="Max entries" value={field.max ?? ""} onChange={(e) => set({ max: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
          <div className="text-xs text-muted">Fields repeated for each entry (labels can use {"{n}"}, e.g. “Income for adult {"{n}"}”):</div>
          {(field.subfields ?? []).map((sf, i) => (
            <FieldRow key={i} field={sf} showSpan
              onChange={(nf) => set({ subfields: (field.subfields ?? []).map((x, j) => (j === i ? nf : x)) })}
              onRemove={() => set({ subfields: (field.subfields ?? []).filter((_, j) => j !== i) })} />
          ))}
          <button type="button" className="btn self-start border-dashed" onClick={() => set({ subfields: [...(field.subfields ?? []), newField(nextFieldKey((field.subfields ?? []).map((x) => x.key)))] })}>
            + Add field to subform
          </button>
        </div>
      ) : null}
    </div>
  );
}

const BG_PRESETS = ["", "#FFFFFF", "#F4F2FC", "#E7E4FB", "#14142B"];

/** Drop logic settings that were opened but never filled in, or that no longer apply to the question's type. */
function cleanLogic(sections: FormSection[]): FormSection[] {
  const clean = (f: FormField): FormField => {
    const o: FormField = { ...f };
    if (!o.show_if?.field) delete o.show_if;
    if (!o.max_from) delete o.max_from;
    if (o.repeat_from === "" || o.type !== "subform") delete o.repeat_from;
    if (!o.repeat_from || o.type !== "subform") delete o.paginate_entries;
    if (!o.entry_label?.trim() || o.type !== "subform") delete o.entry_label;
    if (!NUMERIC_TYPES.includes(o.type)) { delete o.min_value; delete o.max_value; delete o.max_from; }
    if (o.min_value === undefined || Number.isNaN(o.min_value)) delete o.min_value;
    if (o.max_value === undefined || Number.isNaN(o.max_value)) delete o.max_value;
    if (!o.whole || o.type !== "number") delete o.whole;
    if (o.subfields) o.subfields = o.subfields.map(clean);
    return o;
  };
  return sections.map((sec) => ({ ...sec, fields: sec.fields.map(clean) }));
}

/** How many logic settings point at a question that isn't above them (those questions would never show). */
function countLogicProblems(sections: FormSection[]): number {
  const seen = new Set<string>();
  let n = 0;
  for (const sec of sections) for (const f of sec.fields) {
    n += brokenRefs(f, seen).length;
    seen.add(f.key);
  }
  return n;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function SectionEditor({ section, label, open, onToggle, takenKeys, keyCounts, priorFields, formPaginate, onRenameKey, onChange, onRemove }: {
  section: FormSection; label: string; open: boolean; onToggle: () => void;
  takenKeys: string[]; keyCounts: Map<string, number>;
  /** Every question in the sections above this one (what this section's questions can refer to). */
  priorFields: QuestionRef[];
  formPaginate?: boolean;
  onRenameKey: (fieldIndex: number, to: string) => void;
  onChange: (s: FormSection) => void; onRemove: () => void;
}) {
  // Questions above field `i`: all earlier sections plus the fields before it here (first of each key).
  const earlierFor = (i: number, own: string): QuestionRef[] => {
    const seen = new Set<string>();
    return [...priorFields, ...section.fields.slice(0, i).map(toRef)].filter((q) => {
      if (!q.key || q.key === own || seen.has(q.key)) return false;
      seen.add(q.key); return true;
    });
  };
  const problemCount = section.fields.reduce((n, f, i) => n + brokenRefs(f, new Set(earlierFor(i, f.key).map((q) => q.key))).length, 0);
  const [contactNote, setContactNote] = useState("");
  const setField = (i: number, f: FormField) => onChange({ ...section, fields: section.fields.map((x, j) => (j === i ? f : x)) });
  const addField = () => onChange({ ...section, fields: [...section.fields, newField(nextFieldKey(takenKeys))] });
  const removeField = (i: number) => onChange({ ...section, fields: section.fields.filter((_, j) => j !== i) });
  const addContactBlock = () => {
    // Skip any contact question the form already has — adding the block twice used to create
    // duplicate first_name / email / phone keys.
    const have = new Set(takenKeys);
    const missing = CONTACT_BLOCK_FIELDS.filter((f) => !have.has(f.key)).map((f) => ({ ...f }));
    if (!missing.length) { setContactNote("This form already has the name, email and phone questions."); return; }
    setContactNote(missing.length < CONTACT_BLOCK_FIELDS.length ? "Added the contact questions this form was missing." : "");
    onChange({ ...section, fields: [...section.fields, ...missing] });
  };
  const requiredCount = section.fields.filter((f) => f.required).length;
  const dupCount = section.fields.filter((f) => (keyCounts.get(f.key) ?? 0) > 1).length;
  const bodyId = `form-section-${section.id}`;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={bodyId}
          className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <Chevron open={open} />
          <span className="truncate font-semibold">{label}{section.heading ? ` · ${section.heading}` : ""}</span>
          <span className="shrink-0 text-xs text-muted">
            {section.fields.length} {section.fields.length === 1 ? "field" : "fields"}{requiredCount ? ` · ${requiredCount} required` : ""}
          </span>
          {dupCount ? <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">duplicate key</span> : null}
          {problemCount ? <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">logic issue</span> : null}
        </button>
        <button type="button" className="text-sm text-red-700" onClick={onRemove}>Remove section</button>
      </div>

      <div id={bodyId} hidden={!open} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input className="input flex-1" placeholder="Section heading (optional)" value={section.heading ?? ""} onChange={(e) => onChange({ ...section, heading: e.target.value })} />
          <select className="input w-40" value={section.columns} onChange={(e) => onChange({ ...section, columns: Number(e.target.value) as 1 | 2 })}>
            <option value={1}>1 column</option>
            <option value={2}>2 columns (desktop)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Background</span>
          <div className="flex gap-1.5">
            {BG_PRESETS.map((c) => (
              <button key={c || "none"} type="button" title={c || "None"} onClick={() => onChange({ ...section, background: c || undefined })}
                className={`h-7 w-7 rounded-full border ${(section.background ?? "") === c ? "ring-2 ring-primary ring-offset-1" : "border-line"}`}
                style={{ background: c || "repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 50% / 10px 10px" }} />
            ))}
          </div>
          <input type="color" value={section.background || "#ffffff"} onChange={(e) => onChange({ ...section, background: e.target.value })} className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent" />
        </div>

        {section.fields.map((f, i) => {
          const earlier = earlierFor(i, f.key);
          return (
            <FieldRow key={i} field={f} showSpan={section.columns === 2} duplicate={(keyCounts.get(f.key) ?? 0) > 1}
              earlier={earlier} problems={brokenRefs(f, new Set(earlier.map((q) => q.key)))} formPaginate={formPaginate}
              onRenameKey={(to) => onRenameKey(i, to)}
              onChange={(nf) => setField(i, nf)} onRemove={() => removeField(i)} />
          );
        })}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn border-dashed" onClick={addField}>+ Add field</button>
          <button type="button" className="btn border-dashed" onClick={addContactBlock}>+ Add contact block (Name, Email, Phone)</button>
          {contactNote ? <span className="text-xs text-muted">{contactNote}</span> : null}
        </div>
      </div>
    </div>
  );
}

export function FormEditor({ initial }: { initial: CmsForm }) {
  const router = useRouter();
  const [form, setForm] = useState<CmsForm>({ ...initial, sections: initial.sections ?? [] });
  const [mode, setMode] = useState<"fields" | "embed">(initial.embed_html ? "embed" : "fields");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof CmsForm>(k: K, v: CmsForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleSection = (id: string) => setCollapsed((c) => { const n = new Set(c); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  // every question key in the form, and how many times each is used
  const allKeys = form.sections.flatMap((sec) => sec.fields.map((f) => f.key));
  const keyCounts = new Map<string, number>();
  allKeys.forEach((k) => keyCounts.set(k, (keyCounts.get(k) ?? 0) + 1));

  const setSection = (i: number, s: FormSection) => set("sections", form.sections.map((x, j) => (j === i ? s : x)));
  const addSection = () => set("sections", [...form.sections, { id: `s${Date.now().toString(36)}`, columns: 1, fields: [] }]);
  const removeSection = (i: number) => set("sections", form.sections.filter((_, j) => j !== i));

  // Rename one question's key. If nothing else still uses the old key, every condition, limit, entry
  // count and {answer} in a label that pointed at it follows the rename, so logic never silently breaks.
  const renameFieldKey = (si: number, fi: number, to: string) => setForm((f) => {
    const from = f.sections[si].fields[fi].key;
    const sections = f.sections.map((sec, i) => ({ ...sec, fields: sec.fields.map((fld, j) => (i === si && j === fi ? { ...fld, key: to } : fld)) }));
    if (sections.some((sec) => sec.fields.some((fld) => fld.key === from))) return { ...f, sections }; // another question still has that key
    const swap = (k: string | undefined) => (k === from ? to : k);
    const swapTokens = (t: string | undefined) => t?.replace(TOKEN_RE, (m, k: string) => (k === from ? `{${to}}` : m));
    return { ...f, sections: sections.map((sec) => ({ ...sec, fields: sec.fields.map((fld) => ({
      ...fld,
      label: swapTokens(fld.label) ?? fld.label,
      entry_label: swapTokens(fld.entry_label),
      max_from: swap(fld.max_from),
      repeat_from: swap(fld.repeat_from),
      show_if: fld.show_if ? { ...fld.show_if, field: swap(fld.show_if.field) as string } : undefined,
      subfields: fld.subfields?.map((sf) => ({ ...sf, label: swapTokens(sf.label) ?? sf.label })),
    })) })) };
  });

  async function save() {
    setMsg(""); setSaving(true);
    // Two questions with the same key share one answer, so make every key unique before saving.
    const { sections: dedupedSections, renamed } = dedupeKeys(cleanLogic(form.sections));
    // Exactly what gets stored — a JSON round-trip drops any leftover `undefined` settings.
    const cleanSections: FormSection[] = JSON.parse(JSON.stringify(dedupedSections));
    const logicProblems = countLogicProblems(cleanSections);
    const row = {
      name: form.name, slug: slugify(form.slug || form.name), description: form.description || null,
      sections: mode === "fields" ? cleanSections : [],
      embed_html: mode === "embed" ? form.embed_html || null : null,
      submit_label: form.submit_label, success_message: form.success_message,
      form_key: form.form_key || "form", is_active: form.is_active,
      paginate: mode === "fields" ? form.paginate : false,
    };
    const { error } = await createClient().from("forms").update(row).eq("id", form.id);
    setSaving(false);
    const notes = [
      renamed.length ? `Renamed ${renamed.length} duplicate question key${renamed.length === 1 ? "" : "s"}: ${renamed.map((r) => `${r.from} → ${r.to}`).join(", ")}.` : "",
      logicProblems ? `⚠ ${logicProblems} logic setting${logicProblems === 1 ? "" : "s"} point${logicProblems === 1 ? "s" : ""} at a question that isn't above it — that question will stay hidden until fixed.` : "",
    ].filter(Boolean).join(" ");
    setMsg(error ? error.message : notes ? `Saved. ${notes}` : "Saved");
    if (!error) setForm((f) => ({ ...f, slug: row.slug, sections: cleanSections }));
  }

  async function remove() {
    if (!confirm(`Delete "${form.name}"? This cannot be undone.`)) return;
    await createClient().from("forms").delete().eq("id", form.id);
    router.push("/admin/forms"); router.refresh();
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-center gap-3">
        <Link href="/admin/forms" className="text-muted">← Forms</Link>
        <h1 className="font-display text-3xl">{form.name}</h1>
        <span className="text-sm text-muted">/forms/{form.slug}</span>
        <div className="ml-auto flex gap-2">
          {msg ? <span className="self-center text-sm text-muted">{msg}</span> : null}
          <a href={`/forms/${form.slug}`} target="_blank" className="btn">Preview ↗</a>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? <><Spinner /> Saving…</> : "Save"}</button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <section className="card flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Details</h2>
          <label className="label">Name<input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} /></label>
          <label className="label">Link (/forms/…)<input className="input" value={form.slug} onChange={(e) => set("slug", e.target.value)} /></label>
          <label className="label">Description (shown on the standalone page)<textarea rows={2} className="textarea" value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} /></label>
          <label className="label">Form key (groups submissions, used by follow-up sequences)<input className="input" value={form.form_key} onChange={(e) => set("form_key", e.target.value)} /></label>
          <label className="label">Submit button label<input className="input" value={form.submit_label} onChange={(e) => set("submit_label", e.target.value)} /></label>
          <label className="label">Thank-you message<input className="input" value={form.success_message} onChange={(e) => set("success_message", e.target.value)} /></label>
          <label className="flex items-center justify-between">Active<input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} /></label>
          {mode === "fields" ? (
            <label className="flex items-center justify-between">
              Paginate (one section per step)
              <input type="checkbox" checked={form.paginate} onChange={(e) => set("paginate", e.target.checked)} />
            </label>
          ) : null}
          {mode === "fields" ? (
            <>
              <label className="label">Choice style
                <select className="input" value={form.choice_style ?? "simple"} onChange={(e) => set("choice_style", e.target.value === "boxed" ? "boxed" : undefined)}>
                  <option value="simple">Simple (small radio/checkbox, plain text)</option>
                  <option value="boxed">Boxed (bigger buttons, every question in a bordered card)</option>
                </select>
              </label>
              <label className="label">Appearance
                <select className="input" value={form.theme ?? "light"} onChange={(e) => set("theme", e.target.value === "dark" ? "dark" : undefined)}>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
            </>
          ) : null}
          {form.paginate && form.sections.length <= 1 ? (
            <p className="text-xs text-muted">Add more than one section for pagination to take effect.</p>
          ) : null}
          <button className="btn self-start text-red-700" onClick={remove}>Delete form</button>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex rounded-lg bg-white p-1">
            <button className={`h-9 flex-1 rounded-md text-sm font-medium ${mode === "fields" ? "bg-ground" : "text-muted"}`} onClick={() => setMode("fields")}>Build fields</button>
            <button className={`h-9 flex-1 rounded-md text-sm font-medium ${mode === "embed" ? "bg-ground" : "text-muted"}`} onClick={() => setMode("embed")}>Use embed code</button>
          </div>

          {mode === "fields" ? (
            <>
              {form.sections.length > 1 ? (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted">{form.sections.length} {form.paginate ? "steps" : "sections"}</span>
                  <button type="button" className="font-medium text-primary" onClick={() => setCollapsed(new Set(form.sections.map((x) => x.id)))}>Collapse all</button>
                  <button type="button" className="font-medium text-primary" onClick={() => setCollapsed(new Set())}>Expand all</button>
                </div>
              ) : null}
              {form.sections.map((s, i) => (
                <SectionEditor key={s.id} section={s} label={`${form.paginate ? "Step" : "Section"} ${i + 1}`}
                  open={!collapsed.has(s.id)} onToggle={() => toggleSection(s.id)}
                  takenKeys={allKeys} keyCounts={keyCounts}
                  priorFields={form.sections.slice(0, i).flatMap((x) => x.fields.map(toRef))} formPaginate={form.paginate}
                  onRenameKey={(fi, to) => renameFieldKey(i, fi, to)}
                  onChange={(ns) => setSection(i, ns)} onRemove={() => removeSection(i)} />
              ))}
              <button type="button" className="btn self-start border-dashed" onClick={addSection}>+ Add {form.paginate ? "step" : "section"}</button>
            </>
          ) : (
            <div className="card">
              <label className="label">Embed code
                <textarea rows={14} className="textarea font-mono text-xs" placeholder="Paste the embed <div> + <script> here"
                  value={form.embed_html ?? ""} onChange={(e) => set("embed_html", e.target.value)} />
                <span className="text-xs text-muted">For trusted third-party form providers only (e.g. Zoho Forms). Renders exactly as pasted.</span>
              </label>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
