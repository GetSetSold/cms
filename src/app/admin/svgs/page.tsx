import { requireStaff } from "@/lib/auth";
import { SvgLibrary } from "@/components/admin/SvgLibrary";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import type { SvgAsset } from "@/lib/types";

export default async function SvgsPage() {
  const { supabase } = await requireStaff(["admin", "editor"]);
  const { data } = await supabase.from("svg_assets").select("id,name,markup,tags").order("created_at", { ascending: false });
  return (
    <>
      <AdminPageHeader title="SVG library" />
      <div className="flex flex-col gap-6 p-8">
        <p className="text-muted">The site uses SVG only. Uploads are cleaned of scripts automatically. Use the classes
          <code className="mx-1 rounded bg-soft px-1">c-primary</code>, <code className="mx-1 rounded bg-soft px-1">c-accent</code>,
          <code className="mx-1 rounded bg-soft px-1">c-ink</code>, <code className="mx-1 rounded bg-soft px-1">c-soft</code> on shapes to follow the theme colours.</p>
      <SvgLibrary initial={(data ?? []) as SvgAsset[]} />
      </div>
    </>
  );
}
