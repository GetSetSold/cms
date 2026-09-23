"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9/]+/g, "-").replace(/-+/g, "-").replace(/(^[-/]+|[-/]+$)/g, "");

export function NewPageForm({ templates }: { templates: { id: string; name: string; description: string | null }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [template, setTemplate] = useState(templates[0]?.id ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true); setError("");
    const { data, error } = await createClient().rpc("create_page_from_template", {
      p_template: template, p_title: title, p_slug: slug || slugify(title),
    });
    setBusy(false);
    if (error) return setError(error.message.includes("duplicate") ? "That URL is already used." : error.message);
    router.push(`/admin/pages/${data}`);
  }

  if (!open) return <button className="btn-primary self-start" onClick={() => setOpen(true)}>+ New page</button>;

  return (
    <div className="card flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="label">Title<input className="input" value={title} onChange={(e) => { setTitle(e.target.value); setSlug(slugify(e.target.value)); }} /></label>
        <label className="label">URL<div className="flex items-center gap-1"><span className="text-muted">/</span><input className="input" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="services/roofing" /></div></label>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[13px] text-muted">Start from a template</legend>
        <div className="grid gap-3 md:grid-cols-5">
          {templates.map((t) => (
            <label key={t.id} className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-4 ${template === t.id ? "border-primary bg-[#E4F0EE]" : "border-line"}`}>
              <input type="radio" name="template" className="sr-only" checked={template === t.id} onChange={() => setTemplate(t.id)} />
              <span className="font-medium">{t.name}</span>
              <span className="text-xs text-muted">{t.description}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={!title || busy} onClick={create}>{busy ? "Creating…" : "Create page"}</button>
        <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}
