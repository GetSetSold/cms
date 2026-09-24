import { requireStaff } from "@/lib/auth";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import type { SiteSettings, SvgAsset } from "@/lib/types";

export default async function SettingsPage() {
  const { supabase } = await requireStaff(["admin"]);
  const [{ data: settings }, { data: svgs }] = await Promise.all([
    supabase.from("site_settings").select("*").eq("id", 1).single(),
    supabase.from("svg_assets").select("id,name,markup,tags").order("name"),
  ]);
  return (
    <>
      <AdminPageHeader title="Settings" />
      <div className="flex flex-col gap-6 p-8">
        <SettingsForm initial={settings as SiteSettings} svgs={(svgs ?? []) as SvgAsset[]} />
      </div>
    </>
  );
}
