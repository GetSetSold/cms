"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "./Spinner";

const MENU_W = 208; // w-52
const MENU_H = 124; // 3 rows of h-9 + padding/gaps

export function PageRowActions({ pageId, pageTitle }: { pageId: string; pageTitle: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"duplicate" | "template" | "delete" | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // The menu is positioned fixed (not absolute) so the table wrapper's
  // overflow-hidden can't clip it, and flips up when there's no room below.
  function toggle() {
    if (open) { setOpen(false); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const flipUp = r.bottom + 4 + MENU_H > window.innerHeight;
    setPos({
      top: flipUp ? Math.max(8, r.top - 4 - MENU_H) : r.bottom + 4,
      left: Math.max(8, Math.min(r.right - MENU_W, window.innerWidth - MENU_W - 8)),
    });
    setOpen(true);
  }

  // Fixed coordinates go stale on scroll/resize — just close.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open ]);

  async function duplicate() {
    setBusy("duplicate"); setOpen(false);
    const supabase = createClient();
    const [{ data: page }, { data: sections }] = await Promise.all([
      supabase.from("pages").select("*").eq("id", pageId).single(),
      supabase.from("page_sections").select("*").eq("page_id", pageId).order("position"),
    ]);
    if (!page) { setBusy(null); return; }
    const slug = `${page.slug}-copy-${Date.now().toString(36)}`;
    const { data: newPage, error } = await supabase.from("pages").insert({
      title: `${page.title} (copy)`, slug, page_type: page.page_type, template_id: page.template_id,
      status: "draft", seo_title: page.seo_title, seo_description: page.seo_description,
      hide_nav: page.hide_nav, hide_footer: page.hide_footer,
    }).select("id").single();
    if (error || !newPage) { setBusy(null); return; }
    if (sections?.length) {
      await supabase.from("page_sections").insert(
        sections.map((s) => ({ page_id: newPage.id, block_type: s.block_type, position: s.position, data: s.data, settings: s.settings, is_visible: s.is_visible })),
      );
    }
    setBusy(null);
    router.push(`/admin/pages/${newPage.id}`);
  }

  async function saveAsTemplate() {
    setBusy("template"); setOpen(false);
    const supabase = createClient();
    const [{ data: page }, { data: sections }] = await Promise.all([
      supabase.from("pages").select("page_type").eq("id", pageId).single(),
      supabase.from("page_sections").select("block_type,data,settings").eq("page_id", pageId).order("position"),
    ]);
    const blocks = (sections ?? []).map((s) => ({ type: s.block_type, data: s.data, settings: s.settings }));
    const { error } = await supabase.from("templates").insert({
      name: `${pageTitle} template`, slug: `${pageTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`,
      page_type: page?.page_type ?? "page", description: `Saved from "${pageTitle}"`, blocks,
    });
    setBusy(null);
    if (!error) router.push("/admin/pages"); // could route to a templates screen if one exists later
  }

  async function remove() {
    if (!confirm(`Delete "${pageTitle}"? This cannot be undone.`)) return;
    setBusy("delete"); setOpen(false);
    await createClient().from("pages").delete().eq("id", pageId);
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="relative inline-block">
      <button ref={btnRef} onClick={toggle} disabled={!!busy} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-ground disabled:opacity-50" aria-label="Page actions">
        {busy ? <Spinner /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>}
      </button>
      {open && pos ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div style={{ top: pos.top, left: pos.left }} className="fixed z-50 flex w-52 flex-col gap-0.5 rounded-xl bg-white p-1.5 shadow-[0_12px_40px_rgba(20,20,43,0.15)]">
            <button onClick={duplicate} className="flex h-9 items-center gap-2 rounded-lg px-2.5 text-left text-sm hover:bg-ground">Duplicate page</button>
            <button onClick={saveAsTemplate} className="flex h-9 items-center gap-2 rounded-lg px-2.5 text-left text-sm hover:bg-ground">Save as template</button>
            <button onClick={remove} className="flex h-9 items-center gap-2 rounded-lg px-2.5 text-left text-sm text-red-700 hover:bg-red-50">Delete page</button>
          </div>
        </>
      ) : null}
    </div>
  );
}
