"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BLOCK_FIELDS } from "@/lib/block-fields";
import type { Page, Section, SvgAsset, CmsForm } from "@/lib/types";
import { FieldEditor } from "./FieldEditor";

type BlockType = { key: string; name: string; category: string; default_data: Record<string, any> };
type Props = { page: Page; sections: Section[]; blockTypes: BlockType[]; svgs: SvgAsset[]; forms: CmsForm[] };

const DEVICES = { Desktop: "100%", Tablet: "820px", Mobile: "390px" } as const;

export function PageBuilder({ page: initialPage, sections: initialSections, blockTypes, svgs, forms }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [page, setPage] = useState(initialPage);
  const [sections, setSections] = useState(initialSections);
  const [savedIds, setSavedIds] = useState(() => initialSections.map((s) => s.id));
  const [selected, setSelected] = useState<string | null>(initialSections[0]?.id ?? null);
  const [tab, setTab] = useState<"content" | "style" | "seo">("content");
  const [device, setDevice] = useState<keyof typeof DEVICES>("Desktop");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [adding, setAdding] = useState(false);

  const current = sections.find((s) => s.id === selected);
  const nameOf = (key: string) => blockTypes.find((b) => b.key === key)?.name ?? key;

  const patchSection = (id: string, patch: Partial<Section>) => {
    setSections((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    setDirty(true);
  };
  const patchPage = (patch: Partial<Page>) => { setPage((p) => ({ ...p, ...patch })); setDirty(true); };

  const move = (i: number, d: -1 | 1) => {
    const n = [...sections];
    if (!n[i + d]) return;
    [n[i], n[i + d]] = [n[i + d], n[i]];
    setSections(n); setDirty(true);
  };

  const addBlock = (bt: BlockType) => {
    const s: Section = {
      id: crypto.randomUUID(), page_id: page.id, block_type: bt.key, position: sections.length,
      data: structuredClone(bt.default_data), settings: {}, is_visible: true,
    };
    const idx = current ? sections.findIndex((x) => x.id === current.id) + 1 : sections.length;
    const n = [...sections]; n.splice(idx, 0, s);
    setSections(n); setSelected(s.id); setAdding(false); setTab("content"); setDirty(true);
  };

  async function save(): Promise<boolean> {
    setBusy("Saving…"); setMessage("");
    const { error: pErr } = await supabase.from("pages").update({
      title: page.title, slug: page.slug, seo_title: page.seo_title || null, seo_description: page.seo_description || null,
      canonical_url: page.canonical_url || null, noindex: page.noindex, hide_nav: page.hide_nav, hide_footer: page.hide_footer,
      publish_at: page.publish_at,
    }).eq("id", page.id);
    if (pErr) { setBusy(""); setMessage(pErr.message); return false; }

    const removed = savedIds.filter((id) => !sections.some((s) => s.id === id));
    if (removed.length) await supabase.from("page_sections").delete().in("id", removed);

    const rows = sections.map((s, i) => ({
      id: s.id, page_id: page.id, block_type: s.block_type, position: i, data: s.data, settings: s.settings, is_visible: s.is_visible,
    }));
    const { error } = await supabase.from("page_sections").upsert(rows);
    setBusy("");
    if (error) { setMessage(error.message); return false; }
    setSavedIds(sections.map((s) => s.id));
    setDirty(false); setPreviewKey((k) => k + 1); setMessage("Saved");
    return true;
  }

  async function publish() {
    if (dirty && !(await save())) return;
    setBusy("Publishing…");
    const { error } = await supabase.rpc("publish_page", { p_page: page.id });
    setBusy("");
    if (error) return setMessage(error.message);
    setPage((p) => ({ ...p, status: "published" })); setMessage("Published"); router.refresh();
  }

  async function unpublish() {
    await supabase.from("pages").update({ status: "draft" }).eq("id", page.id);
    setPage((p) => ({ ...p, status: "draft" })); setMessage("Moved to draft");
  }

  async function remove() {
    if (!confirm(`Delete "${page.title}"? This cannot be undone.`)) return;
    await supabase.from("pages").delete().eq("id", page.id);
    router.push("/admin/pages"); router.refresh();
  }

  const url = page.slug === "home" ? "/" : `/${page.slug}`;

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-white px-5">
        <Link href="/admin/pages" className="text-muted">Pages</Link><span className="text-[#9EA2AC]">/</span>
        <strong className="text-base">{page.title}</strong>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${page.status === "published" ? "bg-[#E4F0EE] text-[#0A4540]" : "bg-[#FBEBDD] text-[#8A3F12]"}`}>
          {dirty ? "Unsaved changes" : page.status}
        </span>
        {message ? <span className="text-xs text-muted" role="status">{message}</span> : null}
        <div className="ml-auto flex rounded-[10px] bg-soft/70 p-1">
          {(Object.keys(DEVICES) as (keyof typeof DEVICES)[]).map((d) => (
            <button key={d} onClick={() => setDevice(d)} className={`h-8 rounded-[7px] px-3 ${device === d ? "bg-white shadow-sm" : "text-muted"}`}>{d}</button>
          ))}
        </div>
        <a href={`${url}?preview=1`} target="_blank" className="btn">Preview ↗</a>
        <button className="btn" onClick={save} disabled={!!busy || !dirty}>{busy === "Saving…" ? busy : "Save draft"}</button>
        {page.status === "published"
          ? <button className="btn" onClick={unpublish}>Unpublish</button>
          : null}
        <button className="btn-primary" onClick={publish} disabled={!!busy}>{busy === "Publishing…" ? busy : page.status === "published" ? "Update live page" : "Publish"}</button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sections */}
        <section className="flex w-[272px] shrink-0 flex-col gap-1.5 overflow-auto border-r border-line bg-white p-4">
          <div className="flex items-center justify-between px-1 pb-2"><strong>Sections</strong><span className="text-xs text-muted">{sections.length}</span></div>
          {sections.map((s, i) => (
            <div key={s.id}
              className={`group flex h-11 items-center gap-1 rounded-lg border px-2 ${s.id === selected ? "border-primary bg-[#E4F0EE] font-medium" : "border-transparent hover:bg-ground"} ${s.is_visible ? "" : "text-[#8A8E97]"}`}>
              <button className="flex-1 truncate text-left" onClick={() => setSelected(s.id)}>{nameOf(s.block_type)}</button>
              {s.settings?.hide_on_mobile ? <span className="text-[10px] text-muted">desktop</span> : null}
              {s.settings?.hide_on_desktop ? <span className="text-[10px] text-muted">mobile</span> : null}
              <span className="hidden gap-0.5 text-muted group-hover:flex">
                <button aria-label="Move up" onClick={() => move(i, -1)}>↑</button>
                <button aria-label="Move down" onClick={() => move(i, 1)}>↓</button>
                <button aria-label={s.is_visible ? "Hide" : "Show"} onClick={() => patchSection(s.id, { is_visible: !s.is_visible })}>{s.is_visible ? "◉" : "○"}</button>
                <button aria-label="Delete" onClick={() => { setSections(sections.filter((x) => x.id !== s.id)); setDirty(true); }}>✕</button>
              </span>
            </div>
          ))}
          <button className="btn mt-2 border-dashed" onClick={() => setAdding(!adding)}>+ Add block</button>
          {adding ? (
            <div className="grid grid-cols-2 gap-1.5">
              {blockTypes.map((b) => (
                <button key={b.key} className="rounded-lg border border-line p-2 text-left text-xs hover:border-primary" onClick={() => addBlock(b)}>
                  <div className="font-medium">{b.name}</div><div className="text-muted">{b.category}</div>
                </button>
              ))}
            </div>
          ) : null}
        </section>

        {/* Preview */}
        <section className="flex min-w-0 flex-1 justify-center overflow-auto bg-[#ECE8E0] p-6">
          <div className="flex w-full flex-col items-center gap-2">
            {dirty ? <p className="text-xs text-muted">Preview shows the last saved version — save to refresh.</p> : null}
            <iframe key={previewKey} src={`${url}?preview=1`} title="Page preview"
              className="h-full min-h-[700px] rounded-xl bg-white shadow-[0_8px_30px_rgba(21,23,28,0.1)]"
              style={{ width: DEVICES[device], maxWidth: "100%" }} />
          </div>
        </section>

        {/* Inspector */}
        <section className="flex w-[340px] shrink-0 flex-col overflow-auto border-l border-line bg-white">
          <div className="flex border-b border-line">
            {(["content", "style", "seo"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`h-12 flex-1 capitalize ${tab === t ? "border-b-2 border-ink font-semibold" : "text-muted"}`}>
                {t === "seo" ? "Page & SEO" : t}
              </button>
            ))}
          </div>
          <div className="p-4">
            {tab === "content" && current ? (
              <FieldEditor fields={BLOCK_FIELDS[current.block_type] ?? []} value={current.data} svgs={svgs} forms={forms}
                onChange={(data) => patchSection(current.id, { data })} />
            ) : null}
            {tab === "style" && current ? (
              <div className="flex flex-col gap-4">
                <label className="label">Background
                  <select className="input" value={current.settings.background ?? "default"}
                    onChange={(e) => patchSection(current.id, { settings: { ...current.settings, background: e.target.value as any } })}>
                    <option value="default">Default</option><option value="muted">Muted</option><option value="dark">Dark</option><option value="brand">Brand colour</option>
                  </select>
                </label>
                <label className="label">Anchor (for #links)
                  <input className="input" value={current.settings.anchor ?? ""} placeholder="quote"
                    onChange={(e) => patchSection(current.id, { settings: { ...current.settings, anchor: e.target.value.replace(/[^a-z0-9-]/gi, "") } })} />
                </label>
                <label className="flex items-center justify-between">Show on mobile
                  <input type="checkbox" checked={!current.settings.hide_on_mobile}
                    onChange={(e) => patchSection(current.id, { settings: { ...current.settings, hide_on_mobile: !e.target.checked } })} />
                </label>
                <label className="flex items-center justify-between">Show on desktop
                  <input type="checkbox" checked={!current.settings.hide_on_desktop}
                    onChange={(e) => patchSection(current.id, { settings: { ...current.settings, hide_on_desktop: !e.target.checked } })} />
                </label>
              </div>
            ) : null}
            {(tab === "content" || tab === "style") && !current ? <p className="text-muted">Select a section to edit it.</p> : null}
            {tab === "seo" ? (
              <div className="flex flex-col gap-4">
                <label className="label">Page title<input className="input" value={page.title} onChange={(e) => patchPage({ title: e.target.value })} /></label>
                <label className="label">URL<input className="input" value={page.slug} onChange={(e) => patchPage({ slug: e.target.value.toLowerCase() })} /></label>
                <label className="label">SEO title<input className="input" value={page.seo_title ?? ""} placeholder={page.title} onChange={(e) => patchPage({ seo_title: e.target.value })} />
                  <span className="text-xs">{(page.seo_title || page.title).length} / 60</span></label>
                <label className="label">Meta description<textarea rows={3} className="textarea" value={page.seo_description ?? ""} onChange={(e) => patchPage({ seo_description: e.target.value })} />
                  <span className="text-xs">{(page.seo_description ?? "").length} / 160</span></label>
                <div className="rounded-lg border border-line p-3">
                  <div className="text-xs text-muted">Search preview</div>
                  <div className="text-lg text-[#1A0DAB]">{page.seo_title || page.title}</div>
                  <div className="text-[13px] text-muted">{page.seo_description || "Uses the default description from Settings."}</div>
                </div>
                <label className="label">Canonical URL (optional)<input className="input" value={page.canonical_url ?? ""} onChange={(e) => patchPage({ canonical_url: e.target.value })} /></label>
                <label className="label">Schedule publish (optional)
                  <input type="datetime-local" className="input" value={page.publish_at ? page.publish_at.slice(0, 16) : ""}
                    onChange={(e) => patchPage({ publish_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                </label>
                <label className="flex items-center justify-between">Hide from search engines<input type="checkbox" checked={page.noindex} onChange={(e) => patchPage({ noindex: e.target.checked })} /></label>
                <label className="flex items-center justify-between">Hide navigation (landing page)<input type="checkbox" checked={page.hide_nav} onChange={(e) => patchPage({ hide_nav: e.target.checked })} /></label>
                <label className="flex items-center justify-between">Hide footer<input type="checkbox" checked={page.hide_footer} onChange={(e) => patchPage({ hide_footer: e.target.checked })} /></label>
                <button className="btn mt-4 text-red-700" onClick={remove}>Delete page</button>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
