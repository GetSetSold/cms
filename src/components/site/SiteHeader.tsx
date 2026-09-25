"use client";
import Link from "next/link";
import { useState } from "react";
import type { SiteSettings, SvgAsset } from "@/lib/types";
import { Svg } from "./Svg";

function PlusMinus({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="shrink-0">
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

  return (
    <header className="sticky top-0 z-40 border-b border-line backdrop-blur" style={{ background: h.bg || "var(--c-ground, #fff)", color: h.text || undefined }}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:h-20 md:px-10">
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

        <nav className="hidden gap-9 text-[15px] md:flex" aria-label="Main">
          {settings.navigation.map((n) =>
            n.columns?.length ? (
              <div key={n.href} className="relative" onMouseEnter={() => setOpenMega(n.href)} onMouseLeave={() => setOpenMega(null)}>
                <button
                  className={`flex items-center gap-1.5 border-b-2 pb-1 hover:text-primary ${openMega === n.href ? "border-primary text-primary" : "border-transparent"}`}
                  aria-expanded={openMega === n.href}
                  onClick={() => setOpenMega(openMega === n.href ? null : n.href)}
                >
                  {n.label}<PlusMinus open={openMega === n.href} />
                </button>
                {openMega === n.href ? (
                  <div className="absolute left-1/2 top-full z-50 w-[560px] -translate-x-1/2 pt-3">
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-8 rounded-2xl bg-white p-6 text-ink shadow-[0_16px_50px_rgba(20,20,43,0.15)]">
                      {n.columns.map((col, i) => (
                        <div key={i} className="flex flex-col gap-2.5">
                          {col.heading ? <div className="text-xs font-semibold uppercase tracking-wide text-muted">{col.heading}</div> : null}
                          {col.links.map((l) => (
                            <Link key={l.href} href={l.href} className="text-[15px] hover:text-primary" onClick={() => setOpenMega(null)}>{l.label}</Link>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <Link key={n.href} href={n.href} className="hover:text-primary">{n.label}</Link>
            ),
          )}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          {settings.contact?.phone ? (
            <a href={`tel:${settings.contact.phone}`} className="text-[15px]">{settings.contact.phone}</a>
          ) : null}
          {settings.header_cta?.label ? (
            <Link href={settings.header_cta.href} className="flex h-11 items-center rounded-full bg-primary px-5 text-[15px] font-medium text-white">
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
                  <div className="flex flex-col gap-4 pb-3 pl-3">
                    {n.columns.map((col, i) => (
                      <div key={i} className="flex flex-col gap-1.5">
                        {col.heading ? <div className="text-xs font-semibold uppercase tracking-wide text-muted">{col.heading}</div> : null}
                        {col.links.map((l) => (
                          <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-1.5 text-base">{l.label}</Link>
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
