import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { NewPageForm } from "@/components/admin/NewPageForm";

const STATUS_STYLE: Record<string, string> = {
  published: "bg-[#E4F0EE] text-[#0A4540]",
  draft: "bg-[#FBEBDD] text-[#8A3F12]",
  scheduled: "bg-[#E6E9F7] text-[#2B3A8C]",
  archived: "bg-soft text-muted",
};

export default async function PagesList() {
  const { supabase } = await requireStaff(["admin", "editor"]);
  const [{ data: pages }, { data: templates }] = await Promise.all([
    supabase.from("pages").select("id,title,slug,status,page_type,updated_at").order("slug"),
    supabase.from("templates").select("id,name,slug,description").order("name"),
  ]);

  return (
    <div className="flex flex-col gap-6 p-8">
      <h1 className="font-display text-4xl">Pages</h1>
      <NewPageForm templates={templates ?? []} />
      <div className="overflow-hidden rounded-2xl bg-white">
        <table className="w-full text-left">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <tr><th className="p-4">Title</th><th className="p-4">URL</th><th className="p-4">Type</th><th className="p-4">Status</th><th className="p-4">Updated</th></tr>
          </thead>
          <tbody>
            {(pages ?? []).map((p) => (
              <tr key={p.id} className="border-b border-line/60 last:border-0 hover:bg-ground/60">
                <td className="p-4 font-medium"><Link href={`/admin/pages/${p.id}`} className="hover:text-primary">{p.title}</Link></td>
                <td className="p-4 text-muted">{p.slug === "home" ? "/" : `/${p.slug}`}</td>
                <td className="p-4 capitalize text-muted">{p.page_type}</td>
                <td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[p.status]}`}>{p.status}</span></td>
                <td className="p-4 text-muted">{new Date(p.updated_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
