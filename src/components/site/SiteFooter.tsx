import Link from "next/link";
import type { MobileCtaButton, MobileCtaIcon, SiteSettings } from "@/lib/types";

const ROW_COLS: Record<number, string> = { 1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4" };

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const c = settings.contact ?? {};
  const f = settings.footer ?? { rows: [] };
  const rows = f.rows ?? [];
  const [firstRow, ...restRows] = rows;

  return (
    <footer style={{ background: f.bg || undefined, color: f.text || undefined }}>
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-5 pb-28 pt-16 text-[15px] md:px-10 md:pb-12">
        {/* Row 1: brand block (wider) + this row's columns */}
        <div className={`grid grid-cols-2 gap-8 md:[grid-template-columns:1.4fr_repeat(${firstRow?.length || 1},1fr)]`}>
          <div className="col-span-2 flex flex-col gap-3 md:col-span-1">
            <div className="font-display text-3xl">{settings.site_name}</div>
            {f.tagline ? <p className="opacity-75">{f.tagline}</p> : null}
            {c.address ? <p className="opacity-75">{c.address}</p> : null}
            <div className="mt-1 flex flex-col gap-1.5">
              {c.phone ? <a href={`tel:${c.phone}`} className="opacity-75 hover:opacity-100">{c.phone}</a> : null}
              {c.email ? <a href={`mailto:${c.email}`} className="opacity-75 hover:opacity-100">{c.email}</a> : null}
              {c.hours ? <span className="opacity-75">{c.hours}</span> : null}
            </div>
          </div>
          {(firstRow ?? []).map((col, i) => (
            <div key={i} className="flex flex-col gap-2.5">
              {col.heading ? <strong>{col.heading}</strong> : null}
              {col.links.map((l) => <Link key={l.href} href={l.href} className="opacity-75 hover:opacity-100">{l.label}</Link>)}
            </div>
          ))}
        </div>

        {/* Additional rows: full-width, clean grid of their own — never shares
            a track with the brand block, so column count changes never
            distort neighbouring content the way one shared grid did. */}
        {restRows.map((row, ri) => (
          <div key={ri} className={`grid grid-cols-1 gap-8 ${ROW_COLS[Math.min(row.length, 4) as 1 | 2 | 3 | 4]}`}>
            {row.map((col, i) => (
              <div key={i} className="flex flex-col gap-2.5">
                {col.heading ? <strong>{col.heading}</strong> : null}
                {col.links.map((l) => <Link key={l.href} href={l.href} className="opacity-75 hover:opacity-100">{l.label}</Link>)}
              </div>
            ))}
          </div>
        ))}

        <div className="flex flex-col gap-2.5 border-t pt-6 text-sm opacity-75" style={{ borderColor: f.text ? `${f.text}33` : undefined }}>
          <span>© {new Date().getFullYear()} {settings.site_name}</span>
          <Link href="/login" className="hover:opacity-100">Staff login</Link>
        </div>
      </div>
    </footer>
  );
}

const ICONS: Record<MobileCtaIcon, string> = {
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
  message: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z",
  star: "M12 2l2.9 6.9 7.1.6-5.4 4.7 1.7 7-6.3-3.9-6.3 3.9 1.7-7L2 9.5l7.1-.6z",
  home: "M3 11 12 3l9 8M5 10v10h14V10",
  mail: "M4 5h16v14H4zM4 5l8 7 8-7",
  calendar: "M3 5h18v16H3zM3 10h18M8 3v4M16 3v4",
};

function ctaHref(btn: MobileCtaButton, phone?: string) {
  if (btn.type === "call") return `tel:${btn.href || phone || ""}`;
  if (btn.type === "sms") return `sms:${btn.href || phone || ""}`;
  return btn.href || "#";
}

const SIZE = {
  xs: { rect: "h-8 text-[11px]", sq: "h-12 text-[10px]", icon: 13, iconSq: 15 },
  sm: { rect: "h-10 text-[13px]", sq: "h-14 text-[11px]", icon: 15, iconSq: 17 },
  md: { rect: "h-12 text-sm", sq: "h-16 text-xs", icon: 17, iconSq: 20 },
  lg: { rect: "h-14 text-base", sq: "h-20 text-sm", icon: 19, iconSq: 24 },
};

/** Sticky bottom bar on phones — up to 3 configurable buttons (Settings > Mobile bar). */
export function MobileCtaBar({ settings }: { settings: SiteSettings }) {
  const cfg = settings.mobile_cta ?? { buttons: [], shape: "rectangle" as const, size: "md" as const };
  const buttons = (cfg.buttons ?? []).slice(0, 3);
  if (!buttons.length) return null;
  const square = cfg.shape === "square";
  const sizing = SIZE[cfg.size ?? "md"];
  const cols = buttons.length === 3 ? "grid-cols-3" : "grid-cols-2";

  return (
    <div className={`fixed inset-x-0 bottom-0 z-40 grid ${cols} gap-2.5 border-t border-line bg-white p-3 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden`}>
      {buttons.map((btn, i) => {
        const filled = i === buttons.length - 1;
        const cls = square
          ? `flex ${sizing.sq} flex-col items-center justify-center gap-1 rounded-2xl font-medium ${filled ? "bg-primary text-white" : "border border-ink text-ink"}`
          : `flex ${sizing.rect} items-center justify-center gap-2 rounded-full font-medium ${filled ? "bg-primary text-white" : "border border-ink text-ink"}`;
        return (
          <a key={i} href={ctaHref(btn, settings.contact?.phone)} className={cls}>
            <svg width={square ? sizing.iconSq : sizing.icon} height={square ? sizing.iconSq : sizing.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={ICONS[btn.icon]} />
            </svg>
            {btn.label}
          </a>
        );
      })}
    </div>
  );
}
