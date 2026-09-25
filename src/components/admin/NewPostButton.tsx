"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "./Spinner";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function NewPostButton({ categories }: { categories: { id: string; name: string; slug: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    const supabase = createClient();
    const { data: cat } = await supabase.from("blog_categories").select("template_blocks_before,template_blocks_after").eq("id", categoryId).maybeSingle();
    const title = "Untitled post";
    const { data, error } = await supabase.from("blog_posts").insert({
      title, slug: `${slugify(title)}-${Date.now().toString(36)}`, category_id: categoryId || null,
      blocks_before: cat?.template_blocks_before ?? [], blocks_after: cat?.template_blocks_after ?? [],
    }).select("id").single();
    setBusy(false);
    if (!error && data) router.push(`/admin/posts/${data.id}`);
  }

  if (!open) return <button className="btn-primary" onClick={() => setOpen(true)}>+ New post</button>;

  return (
    <div className="flex items-center gap-2">
      <select className="input w-44" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <button className="btn-primary" disabled={busy} onClick={create}>{busy ? <><Spinner /> Creating…</> : "Create"}</button>
      <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
    </div>
  );
}
