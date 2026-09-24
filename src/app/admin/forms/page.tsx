import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { NewFormButton } from "@/components/admin/NewFormButton";

export default async function FormsList() {
  const { supabase } = await requireStaff(["admin", "editor"]);
  const { data: forms } = await supabase.from("forms").select("id,name,slug,form_key,is_active,embed_html").order("name");

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-4xl">Forms</h1>
        <p className="text-muted">Build a form with custom fields, or paste an embed code. Every form gets its own link at /forms/&lt;slug&gt;, and can also be added to any page as a block.</p>
      </div>
      <NewFormButton />
      <div className="overflow-hidden rounded-2xl bg-white">
        <table className="w-full text-left">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <tr><th className="p-4">Name</th><th className="p-4">Link</th><th className="p-4">Type</th><th className="p-4">Leads tagged</th><th className="p-4">Status</th></tr>
          </thead>
          <tbody>
            {(forms ?? []).map((f) => (
              <tr key={f.id} className="border-b border-line/60 last:border-0 hover:bg-ground/60">
                <td className="p-4 font-medium"><Link href={`/admin/forms/${f.id}`} className="hover:text-primary">{f.name}</Link></td>
                <td className="p-4 text-muted">/forms/{f.slug}</td>
                <td className="p-4 text-muted">{f.embed_html ? "Embed" : "Built-in"}</td>
                <td className="p-4 text-muted">{f.form_key}</td>
                <td className="p-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${f.is_active ? "bg-[#E4F0EE] text-[#0A4540]" : "bg-soft text-muted"}`}>
                    {f.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
