"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { CmsForm, FormField } from "@/lib/types";

const FIELD_TYPES: FormField["type"][] = ["text", "email", "tel", "textarea", "select", "checkbox"];
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function FormEditor({ initial }: { initial: CmsForm }) {
  const router = useRouter();
  const [form, setForm] = useState<CmsForm>(initial);
  const [mode, setMode] = useState<"fields" | "embed">(initial.embed_html ? "embed" : "fields");
  const [msg, setMsg] = useState("");
  const set = <K extends keyof CmsForm>(k: K, v: CmsForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const setField = (i: number, patch: Partial<FormField>) =>
    set("fields", form.fields.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const addField = () => set("fields", [...form.fields, { key: `field_${form.fields.length + 1}`, label: "New field", type: "text" }]);
  const removeField = (i: number) => set("fields", form.fields.filter((_, j) => j !== i));

  async function save() {
    setMsg("");
    const row = {
      name: form.name, slug: slugify(form.slug || form.name), description: form.description || null,
      fields: mode === "fields" ? form.fields : [],
      embed_html: mode === "embed" ? form.embed_html || null : null,
      submit_label: form.submit_label, success_message: form.success_message,
      form_key: form.form_key || "form", is_active: form.is_active,
    };
    const { error } = await createClient().from("forms").update(row).eq("id", form.id);
    setMsg(error ? error.message : "Saved");
    if (!error) { set("slug", row.slug); router.refresh(); }
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
          <button className="btn-primary" onClick={save}>Save</button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Details</h2>
          <label className="label">Name<input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} /></label>
          <label className="label">Link (/forms/…)<input className="input" value={form.slug} onChange={(e) => set("slug", e.target.value)} /></label>
          <label className="label">Description (shown on the standalone page)<textarea rows={2} className="textarea" value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} /></label>
          <label className="label">Form key (groups submissions, used by follow-up sequences)<input className="input" value={form.form_key} onChange={(e) => set("form_key", e.target.value)} /></label>
          <label className="flex items-center justify-between">Active<input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} /></label>
          <button className="btn self-start text-red-700" onClick={remove}>Delete form</button>
        </section>

        <section className="card flex flex-col gap-4">
          <div className="flex rounded-lg bg-ground p-1">
            <button className={`h-9 flex-1 rounded-md text-sm font-medium ${mode === "fields" ? "bg-white shadow-sm" : "text-muted"}`} onClick={() => setMode("fields")}>Build fields</button>
            <button className={`h-9 flex-1 rounded-md text-sm font-medium ${mode === "embed" ? "bg-white shadow-sm" : "text-muted"}`} onClick={() => setMode("embed")}>Use embed code</button>
          </div>

          {mode === "fields" ? (
            <>
              <label className="label">Submit button label<input className="input" value={form.submit_label} onChange={(e) => set("submit_label", e.target.value)} /></label>
              <label className="label">Thank-you message<input className="input" value={form.success_message} onChange={(e) => set("success_message", e.target.value)} /></label>
              <div className="flex flex-col gap-3">
                <strong className="text-sm">Fields</strong>
                {form.fields.map((f, i) => (
                  <div key={i} className="flex flex-col gap-2 rounded-lg border border-line p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <input className="input" placeholder="Label" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} />
                      <select className="input" value={f.type} onChange={(e) => setField(i, { type: e.target.value as FormField["type"] })}>
                        {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-3">
                      <input className="input" placeholder="Field key (e.g. pets)" value={f.key} onChange={(e) => setField(i, { key: e.target.value.replace(/[^a-z0-9_]/gi, "_") })} />
                      <label className="flex shrink-0 items-center gap-1.5 text-sm">Required<input type="checkbox" checked={!!f.required} onChange={(e) => setField(i, { required: e.target.checked })} /></label>
                      <button className="shrink-0 text-sm text-red-700" onClick={() => removeField(i)}>Remove</button>
                    </div>
                    {f.type === "select" ? (
                      <input className="input" placeholder="Options, comma separated" value={(f.options ?? []).join(", ")}
                        onChange={(e) => setField(i, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
                    ) : null}
                  </div>
                ))}
                <button className="btn border-dashed" onClick={addField}>+ Add field</button>
              </div>
            </>
          ) : (
            <label className="label">Embed code
              <textarea rows={12} className="textarea font-mono text-xs" placeholder="Paste the embed <div> + <script> here"
                value={form.embed_html ?? ""} onChange={(e) => set("embed_html", e.target.value)} />
              <span className="text-xs text-muted">For trusted third-party form providers only (e.g. Zoho Forms). This renders exactly as pasted.</span>
            </label>
          )}
        </section>
      </div>
    </div>
  );
}
