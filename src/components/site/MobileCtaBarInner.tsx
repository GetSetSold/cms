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

const SIZE: Record<string, { rect: string; sq: string; icon: number; iconSq: number }> = {
  xs: { rect: "h-8 text-[11px]", sq: "h-12 text-[10px]", icon: 13, iconSq: 15 },
  sm: { rect: "h-10 text-[13px]", sq: "h-14 text-[11px]", icon: 15, iconSq: 17 },
  md: { rect: "h-12 text-sm", sq: "h-16 text-xs", icon: 17, iconSq: 20 },
  lg: { rect: "h-14 text-base", sq: "h-20 text-sm", icon: 19, iconSq: 24 },
};

export type ResolvedBarButton = { label: string; href: string; iconSvgMarkup?: string; iconPreset: string };

export function MobileCtaBarInner({
  buttons, shape, size, layout,
}: { buttons: ResolvedBarButton[]; shape: "square" | "rectangle"; size: "xs" | "sm" | "md" | "lg"; layout: "plain" | "active-highlight" }) {
  const pathname = usePathname();
  const square = shape === "square";
  const sizing = SIZE[size] ?? SIZE.md;
  const cols = buttons.length === 3 ? "grid-cols-3" : "grid-cols-2";

  return (
    <div className={`fixed inset-x-0 bottom-0 z-40 grid ${cols} gap-2 border-t border-line bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_16px_rgba(20,20,43,0.06)] backdrop-blur md:hidden`}>
      {buttons.map((btn, i) => {
        // "Active highlight": the tab matching the current path gets the
        // filled treatment instead of always filling the last button.
        const isActive = layout === "active-highlight" && btn.href !== "#" && !btn.href.startsWith("tel:") && !btn.href.startsWith("sms:")
          ? pathname === btn.href || (btn.href !== "/" && pathname.startsWith(btn.href))
          : i === buttons.length - 1;
        const cls = square
          ? `flex ${sizing.sq} flex-col items-center justify-center gap-1 rounded-2xl font-medium ${isActive ? "bg-primary text-white" : "border border-ink text-ink"}`
          : `flex ${sizing.rect} items-center justify-center gap-2 rounded-full font-medium ${isActive ? "bg-primary text-white" : "border border-ink text-ink"}`;
        const iconSize = square ? sizing.iconSq : sizing.icon;
        return (
          <a key={i} href={btn.href} className={cls}>
            {btn.iconSvgMarkup ? (
              <span className="svg-box shrink-0" style={{ width: iconSize, height: iconSize }} dangerouslySetInnerHTML={{ __html: btn.iconSvgMarkup }} />
            ) : (
              <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={ICONS[btn.iconPreset] ?? ICONS.star} />
              </svg>
            )}
            {btn.label}
          </a>
        );
      })}
    </div>
  );
}
