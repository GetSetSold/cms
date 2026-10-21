"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import type { SiteSettings, SvgAsset } from "@/lib/types";
import { Svg } from "./Svg";
import { HeaderAuth } from "./HeaderAuth";

function PlusMinus({ open }: { open: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="shrink-0">
      <path d="M5 12h14" />
      {open ? null : <path d="M12 5v14" />}
    </svg>
  );
}

// Line icons for the mega-menu tiles, keyed by keyword match on the link's
// label + href. Keeps icons in code so nav settings need no schema change.
const ICONS: Record<string, React.ReactNode> = {
  home: (<><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>),
  pin: (<><path d="M12 21s-7-5.5-7-11a7 7 0 0114 0c0 5.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>),
  book: (<><path d="M4 19.5A2.5 2.5 0 016.5 17H20V4H6.5A2.5 2.5 0 004 6.5v13z" /><path d="M4 19.5A2.5 2.5 0 006.5 22H20v-5" /></>),
  calculator: (<><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 7h8M8 12h8M8 16h5" /></>),
  chart: (<><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>),
  star: (<path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" />),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>),
  bell: (<><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" /></>),
  badge: (<><path d="M20 6L9 17l-5-5" /></>),
  key: (<><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M17 4l3 3M14 7l3 3" /></>),
  building: (<><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3" /></>),
  doc: (<><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6" /></>),
  phone: (<path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 2 .7 2.9a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.2-1.2a2 2 0 012.1-.5c.9.3 1.9.6 2.9.7a2 2 0 011.7 2z" />),
  tag: (<><path d="M20.6 13.4L13.4 20.6a2 2 0 01-2.8 0L2 12V2h10l8.6 8.6a2 2 0 010 2.8z" /><circle cx="7.5" cy="7.5" r="1.5" /></>),
  link: (<><path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7" /></>),
};

function iconForLink(label: string, href: string): React.ReactNode {
  const s = `${label} ${href}`.toLowerCase();
  const rules: [RegExp, string][] = [
    [/pre-?con/, "building"],
    [/calcul/, "calculator"],
    [/trend|market|stats|hpi/, "chart"],
    [/guide|blog|learn|faq|how/, "book"],
    [/alert/, "bell"],
    [/valuat|evaluation/, "badge"],
    [/consult|book|appointment|schedule|contact/, "clock"],
    [/vip|cash-?back|reward/, "star"],
    [/rent/, "key"],
    [/landlord|manag/, "building"],
    [/sell|listing/, "tag"],
    [/about|team|contact/, "phone"],
    [/buy|home|house|property|search/, "home"],
    [/caledonia|hamilton|haldimand|niagara|gta|ontario|city|town/, "pin"],
    [/form|appl|doc/, "doc"],
  ];
  for (const [re, key] of rules) if (re.test(s)) return ICONS[key];
  return ICONS.link;
}

function MegaTile({ label, href, onClick }: { label: string; href: string; onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick}
      className="group flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-[#f2f6fc]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-[#eef3fa]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0066CC" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {iconForLink(label, href)}
        </svg>
      </span>
      <span className="text-[15px] font-semibold leading-snug group-hover:text-[#0066CC]">{label}</span>
    </Link>
  );
}

export function SiteHeader({ settings, logo }: { settings: SiteSettings; logo?: SvgAsset | null }) {
  const [open, setOpen] = useState(false);
  const [openMega, setOpenMega] = useState<string | null>(null);
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null);
  // Close delay: the full-width panel sits below the header with a dead gap
  // between button and panel — without this the menu snaps shut mid-travel.
  const closeTimer = useRef<number | null>(null);
  const openMenu = (href: string) => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    setOpenMega(href);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpenMega(null), 200);
  };
  const h = settings.header ?? {};
  const showLogoMobile = h.show_logo_mobile !== false;
  const showLogoDesktop = h.show_logo_desktop !== false;
  const showNameMobile = h.show_name_mobile !== false;
  const showNameDesktop = h.show_name_desktop !== false;
  const compact = settings.theme.density === "compact";

  return (
    <header className="sticky top-0 z-40 border-b border-line backdrop-blur" style={{ background: h.bg || "var(--c-ground, #fff)", color: h.text || undefined }}>
      <div className={`mx-auto flex max-w-7xl items-center justify-between px-5 md:px-10 ${compact ? "h-14 md:h-16" : "h-16 md:h-20"}`}>
        <Link href="/" className="flex items-center" style={{ gap: h.logo_gap ?? 10 }} aria-label={`${settings.site_name} home`}>
          {logo ? <Svg asset={logo} className={`${showLogoMobile ? "" : "hidden"} ${showLogoDesktop ? "md:block" : "md:hidden"}`} style={{ width: h.logo_size ?? 32, height: h.logo_size ?? 32 }} /> : null}
          {(showNameMobile || showNameDesktop) ? (
            <span className="flex flex-col leading-tight">
              <span
                className={`font-display ${showNameMobile ? "" : "hidden"} ${showNameDesktop ? "md:inline" : "md:hidden"} text-[length:var(--name-size-m)] md:text-[length:var(--name-size-d)]`}
                style={{
                  "--name-size-m": `${h.name_size_mobile ?? 24}px`, "--name-size-d": `${h.name_size_desktop ?? 30}px`,
                  fontWeight: h.name_weight === "normal" ? 400 : 700,
                } as React.CSSProperties}
              >
                {settings.site_name}
              </span>
              {h.subline ? (
                <span
                  className={`${showNameMobile ? "" : "hidden"} ${showNameDesktop ? "md:inline" : "md:hidden"} text-[length:var(--sub-size-m)] md:text-[length:var(--sub-size-d)] opacity-70`}
                  style={{
                    "--sub-size-m": `${h.subline_size_mobile ?? 12}px`, "--sub-size-d": `${h.subline_size_desktop ?? 13}px`,
                    fontWeight: h.subline_weight === "bold" ? 700 : 400,
                  } as React.CSSProperties}
                >
                  {h.subline}
                </span>
              ) : null}
            </span>
          ) : null}
        </Link>

        <nav className={`hidden gap-7 md:flex ${compact ? "text-[13px]" : "text-[15px]"}`} aria-label="Main">
          {settings.navigation.map((n) =>
            n.columns?.length ? (
              <div key={n.href} onMouseEnter={() => openMenu(n.href)} onMouseLeave={scheduleClose}>
                <button
                  className={`border-b-2 pb-1 hover:text-[#0066CC] ${openMega === n.href ? "border-[#0066CC] text-[#0066CC]" : "border-transparent"}`}
                  aria-expanded={openMega === n.href}
                  onClick={() => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; } setOpenMega(openMega === n.href ? null : n.href); }}
                >
                  {n.label}
                </button>
                {openMega === n.href ? (
                  <div className="absolute inset-x-0 top-full z-50 border-b border-line bg-white shadow-[0_24px_48px_rgba(20,20,43,0.10)]">
                    <div className="mx-auto grid max-w-7xl grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-x-8 gap-y-2 px-5 py-8 text-ink md:px-10">
                      {n.columns.map((col, i) => (
                        <div key={i} className="flex flex-col">
                          {col.heading ? <div className="px-2.5 pb-2 text-xs font-semibold uppercase tracking-[1.2px] text-[#8a8a93]">{col.heading}</div> : null}
                          {col.links.map((l) => (
                            <MegaTile key={l.href} label={l.label} href={l.href} onClick={() => setOpenMega(null)} />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <Link key={n.href} href={n.href} className="hover:text-[#0066CC]">{n.label}</Link>
            ),
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <HeaderAuth />
          {settings.header_cta?.label ? (
            <Link href={settings.header_cta.href} className={`flex items-center rounded-[var(--radius-btn)] bg-primary font-medium text-white ${compact ? "h-9 px-4 text-[13px]" : "h-11 px-5 text-[15px]"}`}>
              {settings.header_cta.label}
            </Link>
          ) : null}
        </div>

        <button className="flex h-11 w-11 items-center justify-center md:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open ? (
        <nav className="flex flex-col border-t border-line px-5 py-3 md:hidden" aria-label="Mobile">
          {settings.navigation.map((n) =>
            n.columns?.length ? (
              <div key={n.href} className="border-b border-line/60 py-1 last:border-0">
                <button className="flex w-full items-center justify-between py-3 text-lg" aria-expanded={openMobileGroup === n.href}
                  onClick={() => setOpenMobileGroup(openMobileGroup === n.href ? null : n.href)}>
                  {n.label}
                  <PlusMinus open={openMobileGroup === n.href} />
                </button>
                {openMobileGroup === n.href ? (
                  <div className="grid grid-cols-2 gap-2.5 px-1 pb-4 pt-1">
                    {(n.columns ?? []).flatMap((col) => col.links).map((l) => (
                      <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                        className="flex flex-col items-start gap-2 rounded-xl bg-[#f7f9fc] p-3.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#e7effa]">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0066CC" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            {iconForLink(l.label, l.href)}
                          </svg>
                        </span>
                        <span className="text-[13px] font-semibold leading-snug">{l.label}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="border-b border-line/60 py-3 text-lg last:border-0">{n.label}</Link>
            ),
          )}
        </nav>
      ) : null}
    </header>
  );
}
