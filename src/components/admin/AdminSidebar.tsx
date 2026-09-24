"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminNav } from "./AdminNav";
import type { Role } from "@/lib/types";

export function AdminSidebar({
  siteName, role, newLeads, name, email,
}: { siteName: string; role: Role; newLeads: number; name: string; email: string }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("admin_sidebar_collapsed") === "1");
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("admin_sidebar_collapsed", next ? "1" : "0");
  }

  return (
    <aside className={`sticky top-0 flex h-screen shrink-0 flex-col gap-1 bg-ink py-5 text-[#D8DAE0] transition-[width] duration-150 ${collapsed ? "w-[64px] px-2" : "w-[232px] px-3.5"}`}>
      <Link href="/admin" className="flex items-center justify-center px-1 pb-5 font-display text-2xl text-white" title={siteName}>
        {collapsed ? siteName.slice(0, 1) : <>{siteName} <span className="font-sans text-xs text-[#9EA2AC]">CMS</span></>}
      </Link>
      <AdminNav role={role} newLeads={newLeads} collapsed={collapsed} />

      <button
        onClick={toggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="mt-2 flex h-9 items-center justify-center gap-2 rounded-lg text-[#9EA2AC] hover:bg-[#1F2229] hover:text-white"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={collapsed ? "rotate-180" : ""}>
          <path d="M15 6l-6 6 6 6" />
        </svg>
        {collapsed ? null : "Collapse"}
      </button>

      <div className={`mt-auto flex flex-col gap-2 border-t border-[#2A2D35] pt-3 ${collapsed ? "items-center px-0" : "px-2"}`}>
        {collapsed ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2A2D35] text-xs font-semibold text-white" title={`${name} (${role})`}>
            {name.slice(0, 1).toUpperCase()}
          </div>
        ) : (
          <>
            <div className="text-white">{name || email}</div>
            <div className="text-xs capitalize text-[#9EA2AC]">{role}</div>
            <div className="flex gap-3 text-xs">
              <Link href="/" target="_blank" className="text-[#9EA2AC] hover:text-white">View site ↗</Link>
              <Link href="/admin/account" className="text-[#9EA2AC] hover:text-white">Account</Link>
              <form action="/auth/signout" method="post"><button className="text-[#9EA2AC] hover:text-white">Sign out</button></form>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
