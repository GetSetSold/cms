import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/cms";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireStaff();
  const settings = await getSettings();
  const { count: newLeads } = profile.role === "editor"
    ? { count: 0 }
    : await supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "new");

  return (
    <div className="flex min-h-screen bg-ground text-sm">
      <AdminSidebar siteName={settings.site_name} role={profile.role} newLeads={newLeads ?? 0} name={profile.full_name ?? ""} email={profile.email} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
