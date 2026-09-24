"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/types";

const ITEMS: { href: string; label: string; roles: Role[]; icon: string }[] = [
  { href: "/admin/pages", label: "Pages", roles: ["admin", "editor"], icon: "M6 3h9l4 4v14H6z M14 3v5h5" },
  { href: "/admin/leads", label: "Leads", roles: ["admin", "sales"], icon: "M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6 M16 5.5a3 3 0 0 1 0 5.5 M18 14c2 .8 3 2.8 3 6" },
  { href: "/admin/svgs", label: "SVG library", roles: ["admin", "editor"], icon: "M3 4h18v16H3z M21 16l-5-5-9 9" },
  { href: "/admin/forms", label: "Forms", roles: ["admin", "editor"], icon: "M4 5h16v3H4z M4 12h16v7H4z M8 15h2" },
  { href: "/admin/sequences", label: "Follow-ups", roles: ["admin"], icon: "M4 5h16v11H8l-4 4z" },
  { href: "/admin/settings", label: "Settings", roles: ["admin"], icon: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M4.9 4.9l2.1 2.1 M17 17l2.1 2.1 M4.9 19.1L7 17 M17 7l2.1-2.1" },
  { href: "/admin/users", label: "Users", roles: ["admin"], icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21c0-4 3.6-7 8-7s8 3 8 7" },
];

export function AdminNav({ role, newLeads, collapsed }: { role: Role; newLeads: number; collapsed?: boolean }) {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-1" aria-label="Admin">
      {ITEMS.filter((i) => i.roles.includes(role)).map((i) => {
        const active = path.startsWith(i.href);
        const badge = i.href === "/admin/leads" && newLeads > 0;
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined} title={collapsed ? i.label : undefined}
            className={`relative flex h-10 items-center gap-2.5 rounded-lg ${collapsed ? "justify-center px-0" : "px-3"} ${active ? "bg-[#2A2D35] text-white" : "hover:bg-[#1F2229]"}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0"><path d={i.icon} /></svg>
            {collapsed ? null : i.label}
            {badge ? (
              collapsed ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" /> :
              <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-xs text-white">{newLeads}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
