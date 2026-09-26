"use client";
import { usePathname } from "next/navigation";

const ICONS: Record<string, string> = {
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
  message: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z",
  star: "M12 2l2.9 6.9 7.1.6-5.4 4.7 1.7 7-6.3-3.9-6.3 3.9 1.7-7L2 9.5l7.1-.6z",
  home: "M3 11 12 3l9 8M5 10v10h14V10",
  mail: "M4 5h16v14H4zM4 5l8 7 8-7",
  calendar: "M3 5h18v16H3zM3 10h18M8 3v4M16 3v4",
};

const SIZE: Record<string, { rect: string; sq: string; icon: number; iconSq: number; tabIcon: number }> = {
  xs: { rect: "h-8 text-[11px]", sq: "h-12 text-[10px]", icon: 13, iconSq: 15, tabIcon: 20 },
  sm: { rect: "h-10 text-[13px]", sq: "h-14 text-[11px]", icon: 15, iconSq: 17, tabIcon: 22 },
  md: { rect: "h-12 text-sm", sq: "h-16 text-xs", icon: 17, iconSq: 20, tabIcon: 24 },
  lg: { rect: "h-14 text-base", sq: "h-20 text-sm", icon: 19, iconSq: 24, tabIcon: 27 },
};

// Complete literal class names only — a count derived via string interpolation
// (e.g. `grid-cols-${n}`) never gets compiled by Tailwind, since its build-time
// scanner needs the exact string present in source. Learned that one the hard way.
const COLS: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5" };

export type ResolvedBarButton = { label: string; href: string; iconSvgMarkup?: string; iconPreset: string };

export function MobileCtaBarInner({
  buttons, shape, size, layout, style, barBg,
}: {
  buttons: ResolvedBarButton[]; shape: "square" | "rectangle"; size: "xs" | "sm" | "md" | "lg";
  layout: "plain" | "active-highlight"; style: "buttons" | "tabs"; barBg: "light" | "dark";
}) {
  const pathname = usePathname();
  const sizing = SIZE[size] ?? SIZE.md;
  const cols = COLS[Math.min(buttons.length, 5)] ?? COLS[3];
  const dark = barBg === "dark";

  const isActive = (btn: ResolvedBarButton, i: number) =>
    layout === "active-highlight" && btn.href !== "#" && !btn.href.startsWith("tel:") && !btn.href.startsWith("sms:")
      ? pathname === btn.href || (btn.href !== "/" && pathname.startsWith(btn.href))
      : i === buttons.length - 1;

  const icon = (btn: ResolvedBarButton, px: number) =>
    btn.iconSvgMarkup ? (
      <span className="svg-box shrink-0" style={{ width: px, height: px }} dangerouslySetInnerHTML={{ __html: btn.iconSvgMarkup }} />
    ) : (
      <svg width={px} height={px} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={ICONS[btn.iconPreset] ?? ICONS.star} />
      </svg>
    );

  const barCls = `fixed inset-x-0 bottom-0 z-40 grid ${cols} gap-1 border-t px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_16px_rgba(20,20,43,0.06)] backdrop-blur md:hidden ${dark ? "border-white/10 bg-black/95" : "border-line bg-white/95"}`;

  if (style === "tabs") {
    return (
      <div className={barCls}>
        {buttons.map((btn, i) => {
          const active = isActive(btn, i);
          const tone = active ? "text-primary" : dark ? "text-white/60" : "text-ink/60";
          return (
            <a key={i} href={btn.href} className={`flex flex-col items-center justify-center gap-1 py-1 ${tone}`}>
              {icon(btn, sizing.tabIcon)}
              <span className="text-[11px] font-medium">{btn.label}</span>
            </a>
          );
        })}
      </div>
    );
  }

  const square = shape === "square";
  return (
    <div className={barCls}>
      {buttons.map((btn, i) => {
        const active = isActive(btn, i);
        const base = active
          ? "bg-primary text-white"
          : dark ? "border border-white/30 text-white" : "border border-ink text-ink";
        const cls = square
          ? `flex ${sizing.sq} flex-col items-center justify-center gap-1 rounded-2xl font-medium ${base}`
          : `flex ${sizing.rect} items-center justify-center gap-2 rounded-full font-medium ${base}`;
        return (
          <a key={i} href={btn.href} className={cls}>
            {icon(btn, square ? sizing.iconSq : sizing.icon)}
            {btn.label}
          </a>
        );
      })}
    </div>
  );
}
