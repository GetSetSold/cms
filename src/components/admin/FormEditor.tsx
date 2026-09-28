"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CONTACT_BLOCK_FIELDS } from "@/lib/types";
import type { CmsForm, FormField, FormFieldType, FormSection } from "@/lib/types";
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

function FieldRow({ field, showSpan, duplicate, onChange, onRemove }: { field: FormField; showSpan: boolean; duplicate?: boolean; onChange: (f: FormField) => void; onRemove: () => void }) {
  const [showSubBuilder, setShowSubBuilder] = useState(field.type === "subform");
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line p-3">
      <div className="grid grid-cols-2 gap-2">
        <input className="input" placeholder="Label" value={field.label} onChange={(e) => onChange({ ...field, label: e.target.value })} />
        <select className="input" value={field.type} onChange={(e) => { const t = e.target.value as FormFieldType; onChange({ ...field, type: t }); setShowSubBuilder(t === "subform"); }}>
          {FIELD_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input className="input w-40" placeholder="Field key" value={field.key} onChange={(e) => onChange({ ...field, key: e.target.value.replace(/[^a-z0-9_]/gi, "_") })} />
        <label className="flex shrink-0 items-center gap-1.5 text-sm">Required<input type="checkbox" checked={!!field.required} onChange={(e) => onChange({ ...field, required: e.target.checked })} /></label>
        {showSpan ? (
          <label className="flex shrink-0 items-center gap-1.5 text-sm">Full width<input type="checkbox" checked={field.span === 2} onChange={(e) => onChange({ ...field, span: e.target.checked ? 2 : 1 })} /></label>
        ) : null}
        <button type="button" className="ml-auto shrink-0 text-sm text-red-700" onClick={onRemove}>Remove</button>
      </div>
      {duplicate ? <p className="text-xs text-red-700">Another question uses the key “{field.key}”, so their answers would clash. It will be renamed automatically when you save — or change it here.</p> : null}
      {HAS_OPTIONS.includes(field.type) ? (
        <OptionsEditor options={field.options ?? []} onChange={(options) => onChange({ ...field, options })} />
      ) : null}
      {field.type === "subform" && showSubBuilder ? (
        <div className="flex flex-col gap-2 rounded-lg bg-ground p-3">
          <div className="flex flex-wrap gap-3">
            <input className="input flex-1" placeholder={'"Add another…" button label'} value={field.repeat_label ?? ""} onChange={(e) => onChange({ ...field, repeat_label: e.target.value })} />
            <input className="input w-28" type="number" min={1} placeholder="Max entries" value={field.max ?? ""} onChange={(e) => onChange({ ...field, max: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
          <div className="text-xs text-muted">Fields repeated for each entry:</div>
          {(field.subfields ?? []).map((sf, i) => (
            <FieldRow key={i} field={sf} showSpan
              onChange={(nf) => onChange({ ...field, subfields: (field.subfields ?? []).map((x, j) => (j === i ? nf : x)) })}
              onRemove={() => onChange({ ...field, subfields: (field.subfields ?? []).filter((_, j) => j !== i) })} />
          ))}
          <button type="button" className="btn self-start border-dashed" onClick={() => onChange({ ...field, subfields: [...(field.subfields ?? []), newField(nextFieldKey((field.subfields ?? []).map((x) => x.key)))] })}>
            + Add field to subform
          </button>
        </div>
      ) : null}
    </div>
  );
}

const BG_PRESETS = ["", "#FFFFFF", "#F4F2FC", "#E7E4FB", "#14142B"];

function Chevron({ open }: { open: boolean }) {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function SectionEditor({ section, label, open, onToggle, takenKeys, keyCounts, onChange, onRemove }: {
  section: FormSection; label: string; open: boolean; onToggle: () => void;
  takenKeys: string[]; keyCounts: Map<string, number>;
  onChange: (s: FormSection) => void; onRemove: () => void;
}) {
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

        {section.fields.map((f, i) => (
          <FieldRow key={i} field={f} showSpan={section.columns === 2} duplicate={(keyCounts.get(f.key) ?? 0) > 1} onChange={(nf) => setField(i, nf)} onRemove={() => removeField(i)} />
        ))}
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

  async function save() {
    setMsg(""); setSaving(true);
    // Two questions with the same key share one answer, so make every key unique before saving.
    const { sections: cleanSections, renamed } = dedupeKeys(form.sections);
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
    setMsg(error ? error.message : renamed.length ? `Saved. Renamed ${renamed.length} duplicate question key${renamed.length === 1 ? "" : "s"}: ${renamed.map((r) => `${r.from} → ${r.to}`).join(", ")}` : "Saved");
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
