"use client";
import Link from "next/link";
import { useState } from "react";
import type { SiteSettings, SvgAsset } from "@/lib/types";
import { Svg } from "./Svg";

function PlusMinus({ open }: { open: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="shrink-0">
      <path d="M5 12h14" />
      {open ? null : <path d="M12 5v14" />}
    </svg>
  );
}

export function SiteHeader({ settings, logo }: { settings: SiteSettings; logo?: SvgAsset | null }) {
  const [open, setOpen] = useState(false);
  const [openMega, setOpenMega] = useState<string | null>(null);
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null);
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

        <nav className={`hidden gap-9 md:flex ${compact ? "text-[13px]" : "text-[15px]"}`} aria-label="Main">
          {settings.navigation.map((n) =>
            n.columns?.length ? (
              <div key={n.href} onMouseEnter={() => setOpenMega(n.href)} onMouseLeave={() => setOpenMega(null)}>
                <button
                  className={`border-b-2 pb-1 hover:text-[#0066CC] ${openMega === n.href ? "border-[#0066CC] text-[#0066CC]" : "border-transparent"}`}
                  aria-expanded={openMega === n.href}
                  onClick={() => setOpenMega(openMega === n.href ? null : n.href)}
                >
                  {n.label}
                </button>
                {openMega === n.href ? (
                  <div className="absolute inset-x-0 top-full z-50 border-b border-line bg-white/95 backdrop-blur">
                    <div className="mx-auto grid max-w-7xl grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-10 px-5 py-8 text-ink md:px-10">
                      {n.columns.map((col, i) => (
                        <div key={i} className="flex flex-col">
                          {col.heading ? <div className="pb-2 text-xs font-semibold uppercase tracking-wide text-[#0066CC]">{col.heading}</div> : null}
                          {col.links.map((l, j) => (
                            <Link key={l.href} href={l.href} className={`border-b border-line/50 py-2.5 hover:text-[#0066CC] ${j === col.links.length - 1 ? "border-b-0" : ""} ${compact ? "text-[13px]" : "text-[15px]"}`} onClick={() => setOpenMega(null)}>{l.label}</Link>
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

        <div className="hidden items-center gap-4 md:flex">
          {settings.contact?.phone ? (
            <a href={`tel:${settings.contact.phone}`} className={compact ? "text-[13px]" : "text-[15px]"}>{settings.contact.phone}</a>
          ) : null}
          {settings.header_cta?.label ? (
            <Link href={settings.header_cta.href} className={`flex items-center rounded-full bg-primary font-medium text-white ${compact ? "h-9 px-4 text-[13px]" : "h-11 px-5 text-[15px]"}`}>
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
                  <div className="flex flex-col pb-3 pl-3">
                    {n.columns.map((col, i) => (
                      <div key={i} className="flex flex-col">
                        {col.heading ? <div className="pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-[#0066CC]">{col.heading}</div> : null}
                        {col.links.map((l, j) => (
                          <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={`border-b border-line/50 py-2.5 text-base ${j === col.links.length - 1 && i === (n.columns?.length ?? 0) - 1 ? "border-b-0" : ""}`}>{l.label}</Link>
                        ))}
                      </div>
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
