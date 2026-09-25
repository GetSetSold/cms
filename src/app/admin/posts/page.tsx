import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { NewPostButton } from "@/components/admin/NewPostButton";

const STATUS_STYLE: Record<string, string> = {
  published: "bg-[#E4F0EE] text-[#0A4540]",
  draft: "bg-[#FBEBDD] text-[#8A3F12]",
  scheduled: "bg-[#E6E9F7] text-[#2B3A8C]",
  archived: "bg-soft text-muted",
};

export default async function PostsList() {
  const { supabase } = await requireStaff(["admin", "editor"]);
  const [{ data: posts }, { data: categories }] = await Promise.all([
    supabase.from("blog_posts").select("id,title,slug,status,updated_at,blog_categories(name,slug)").order("updated_at", { ascending: false }),
    supabase.from("blog_categories").select("id,name,slug").order("sort_order"),
  ]);

  return (
    <>
      <AdminPageHeader title="Updates">
        <Link href="/admin/categories" className="btn">Categories</Link>
        <NewPostButton categories={categories ?? []} />
      </AdminPageHeader>
      <div className="flex flex-col gap-6 p-8">
        <div className="overflow-hidden rounded-2xl bg-white">
          <table className="w-full text-left">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr><th className="p-4">Title</th><th className="p-4">Category</th><th className="p-4">URL</th><th className="p-4">Status</th><th className="p-4">Updated</th></tr>
            </thead>
            <tbody>
              {(posts ?? []).map((p: any) => (
                <tr key={p.id} className="border-b border-line/60 last:border-0 hover:bg-ground/60">
                  <td className="p-4 font-medium"><Link href={`/admin/posts/${p.id}`} className="hover:text-primary">{p.title}</Link></td>
                  <td className="p-4 text-muted">{p.blog_categories?.name ?? "—"}</td>
                  <td className="p-4 text-muted">/updates/{p.blog_categories?.slug ?? "…"}/{p.slug}</td>
                  <td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[p.status]}`}>{p.status}</span></td>
                  <td className="p-4 text-muted">{new Date(p.updated_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {!posts?.length ? <tr><td colSpan={5} className="p-8 text-center text-muted">No posts yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
