"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MarkdownEditor } from "./MarkdownEditor";
import { BlockListEditor } from "./BlockListEditor";
import { SvgPicker } from "./SvgPicker";
import { Spinner } from "./Spinner";
import type { BlogAuthor, BlogPost, CmsForm, SvgAsset } from "@/lib/types";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
type BlockType = { key: string; name: string; category: string; default_data: Record<string, any> };

function TagsInput({ value, onChange }: { value: string[]; onChange: (t: string[]) => void }) {
  // The input keeps its own raw text so a trailing "," or space while typing
  // isn't immediately stripped by re-deriving the value from the parsed
  // array on every keystroke (that was the bug — it made it impossible to
  // type a second tag, since the comma vanished the instant you typed it).
  const [text, setText] = useState(value.join(", "));
  return (
    <input
      className="input"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => { const tags = text.split(",").map((t) => t.trim()).filter(Boolean); onChange(tags); setText(tags.join(", ")); }}
      placeholder="e.g. first-time buyers, market trends"
    />
  );
}

function GenerateQaCard({ content, onGenerated }: { content: string; onGenerated: (items: { q: string; a: string }[]) => void }) {
  const [provider, setProvider] = useState<"groq" | "museai">("groq");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function generate() {
    if (!content.trim()) { setError("Write something in the post first — there's nothing to generate from yet."); return; }
    setBusy(true); setError(""); setDone(false);
    try {
      const res = await fetch("/api/generate-qa", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, provider }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Something went wrong.");
      onGenerated(body.items);
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Generate Q&amp;A</h2>
      <p className="text-sm text-muted">Drafts Q&amp;A pairs from what you've written above, added as a new Q&amp;A block you can edit or remove below — nothing is published automatically.</p>
      <div className="flex items-center gap-2">
        <select className="input w-40" value={provider} onChange={(e) => setProvider(e.target.value as "groq" | "museai")}>
          <option value="groq">Groq</option>
          <option value="museai">muse.ai</option>
        </select>
        <button className="btn-primary" onClick={generate} disabled={busy}>{busy ? <><Spinner /> Generating…</> : "Generate Q&A"}</button>
        {done ? <span className="text-sm text-muted">Added below — review and edit before publishing.</span> : null}
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

export function PostEditor({
  initial, categories, blockTypes, svgs, forms, authors,
}: { initial: BlogPost; categories: { id: string; name: string; slug: string }[]; blockTypes: BlockType[]; svgs: SvgAsset[]; forms: CmsForm[]; authors: BlogAuthor[] }) {
  const router = useRouter();
  const [post, setPost] = useState<BlogPost>(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const set = <K extends keyof BlogPost>(k: K, v: BlogPost[K]) => setPost((p) => ({ ...p, [k]: v }));
  const category = categories.find((c) => c.id === post.category_id);

  async function save() {
    setSaving(true); setMsg("");
    const row = {
      title: post.title, slug: slugify(post.slug || post.title), category_id: post.category_id || null,
      excerpt: post.excerpt || null, cover_svg_id: post.cover_svg_id || null,
      blocks_before: post.blocks_before, content_md: post.content_md, blocks_after: post.blocks_after,
      author_id: post.author_id || null, tags: post.tags,
      status: post.status, publish_at: post.publish_at,
      seo_title: post.seo_title || null, seo_description: post.seo_description || null,
    };
    const { error } = await createClient().from("blog_posts").update(row).eq("id", post.id);
    setSaving(false);
    setMsg(error ? error.message : "Saved");
    if (!error) { set("slug", row.slug); router.refresh(); }
  }

  async function publish() {
    await createClient().from("blog_posts").update({ status: "published", publish_at: post.publish_at ?? new Date().toISOString() }).eq("id", post.id);
    set("status", "published");
    setMsg("Published"); router.refresh();
  }

  async function remove() {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    await createClient().from("blog_posts").delete().eq("id", post.id);
    router.push("/admin/posts"); router.refresh();
  }

  async function duplicate() {
    const { id, created_at, updated_at, ...rest } = post;
    const { data, error } = await createClient().from("blog_posts").insert({
      ...rest, title: `${post.title} (copy)`, slug: `${post.slug}-copy-${Date.now().toString(36)}`, status: "draft",
    }).select("id").single();
    if (!error && data) router.push(`/admin/posts/${data.id}`);
  }

  const url = `/updates/${category?.slug ?? "…"}/${post.slug}`;

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-center gap-3">
        <Link href="/admin/posts" className="text-muted">← Updates</Link>
        <h1 className="font-display text-2xl">{post.title}</h1>
        <span className="text-sm text-muted">{url}</span>
        <div className="ml-auto flex gap-2">
          {msg ? <span className="self-center text-sm text-muted">{msg}</span> : null}
          <a href={url} target="_blank" className="btn">Preview ↗</a>
          <button className="btn" onClick={duplicate}>Duplicate</button>
          <button className="btn" onClick={save} disabled={saving}>{saving ? <><Spinner /> Saving…</> : "Save draft"}</button>
          <button className="btn-success" onClick={publish}>{post.status === "published" ? "Update live" : "Publish"}</button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <section className="card flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Post details</h2>
          <label className="label">Title<input className="input" value={post.title} onChange={(e) => set("title", e.target.value)} /></label>
          <label className="label">URL slug<input className="input" value={post.slug} onChange={(e) => set("slug", e.target.value)} /></label>
          <label className="label">Category
            <select className="input" value={post.category_id ?? ""} onChange={(e) => set("category_id", e.target.value || null)}>
              <option value="">None</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="label">Excerpt (shown in listings)<textarea rows={3} className="textarea" value={post.excerpt ?? ""} onChange={(e) => set("excerpt", e.target.value)} /></label>
          <div className="label">Cover image<SvgPicker value={post.cover_svg_id} svgs={svgs} onChange={(id) => set("cover_svg_id", id)} /></div>

          <div className="flex flex-col gap-3 rounded-lg border border-line p-3">
            <strong className="text-sm">Author</strong>
            <label className="label">Author
              <select className="input" value={post.author_id ?? ""} onChange={(e) => set("author_id", e.target.value || null)}>
                <option value="">None</option>
                {authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
            <Link href="/admin/authors" className="text-sm text-primary">Manage authors →</Link>
          </div>

          <label className="label">Tags (comma separated — helps SEO clustering)
            <TagsInput value={post.tags} onChange={(tags) => set("tags", tags)} />
          </label>

          <div className="flex flex-col gap-3 rounded-lg border border-line p-3">
            <strong className="text-sm">SEO</strong>
            <label className="label">SEO title<input className="input" placeholder={post.title} value={post.seo_title ?? ""} onChange={(e) => set("seo_title", e.target.value)} /></label>
            <label className="label">Meta description<textarea rows={3} className="textarea" value={post.seo_description ?? ""} onChange={(e) => set("seo_description", e.target.value)} /></label>
          </div>

          <label className="label">Schedule publish (optional)
            <input type="datetime-local" className="input" value={post.publish_at ? post.publish_at.slice(0, 16) : ""} onChange={(e) => set("publish_at", e.target.value ? new Date(e.target.value).toISOString() : null)} />
          </label>
          <button className="btn self-start text-red-700" onClick={remove}>Delete post</button>
        </section>

        <section className="flex flex-col gap-6">
          <div className="card">
            <BlockListEditor label="Blocks before the writing area" blocks={post.blocks_before} blockTypes={blockTypes} svgs={svgs} forms={forms} onChange={(b) => set("blocks_before", b)} />
          </div>

          <div className="card">
            <h2 className="mb-3 text-lg font-semibold">Writing area</h2>
            <MarkdownEditor value={post.content_md} onChange={(v) => set("content_md", v)} />
          </div>

          <GenerateQaCard content={post.content_md} onGenerated={(items) => set("blocks_after", [...post.blocks_after, { type: "qa_block", data: { heading: "Common questions", items }, settings: {} }])} />

          <div className="card">
            <BlockListEditor label="Blocks after the writing area" blocks={post.blocks_after} blockTypes={blockTypes} svgs={svgs} forms={forms} onChange={(b) => set("blocks_after", b)} />
          </div>
        </section>
      </div>
    </div>
  );
}
