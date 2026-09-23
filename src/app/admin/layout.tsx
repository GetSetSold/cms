import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/cms";
import { AdminNav } from "@/components/admin/AdminNav";

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
      <aside className="sticky top-0 flex h-screen w-[232px] shrink-0 flex-col gap-1 bg-ink px-3.5 py-5 text-[#D8DAE0]">
        <Link href="/admin" className="px-2.5 pb-5 font-display text-2xl text-white">
          {settings.site_name} <span className="font-sans text-xs text-[#9EA2AC]">CMS</span>
        </Link>
        <AdminNav role={profile.role} newLeads={newLeads ?? 0} />
        <div className="mt-auto flex flex-col gap-2 border-t border-[#2A2D35] px-2 pt-3">
          <div className="text-white">{profile.full_name || profile.email}</div>
          <div className="text-xs capitalize text-[#9EA2AC]">{profile.role}</div>
          <div className="flex gap-3 text-xs">
            <Link href="/" target="_blank" className="text-[#9EA2AC] hover:text-white">View site ↗</Link>
            <Link href="/admin/account" className="text-[#9EA2AC] hover:text-white">Account</Link>
            <form action="/auth/signout" method="post"><button className="text-[#9EA2AC] hover:text-white">Sign out</button></form>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
