import { isDarkColor, contrastRatio } from "@/lib/color";
import type { BlockCtx } from "./index";

export type MergeLayout = "side" | "stacked";

const shell = "overflow-hidden rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line shadow-[var(--shadow-card)]";

/** The header half. Same fields as the Section Header block (eyebrow, heading, subline). */
function MergedHeader({ data, layout, dark, color, ctx }: { data: any; layout: MergeLayout; dark: boolean; color: string; ctx: BlockCtx }) {
  // Eyebrow: use the brand color (primary on light, accent on dark) only when it
  // actually reads against the card's color — measured, not assumed. Otherwise
  // fall back to plain white/ink, so a blue eyebrow never disappears on a blue card.
  const brand = dark ? ctx.settings.theme?.accent : ctx.settings.theme?.primary;
  const readable = brand && /^#[0-9a-f]{6}$/i.test(brand) && contrastRatio(brand, color) >= 3;
  const eyebrow = readable ? (dark ? "text-accent" : "text-primary") : dark ? "text-white/85" : "text-ink";
  return (
    <div className="flex flex-col gap-5">
      {data.eyebrow ? <div className={`text-base font-semibold md:text-lg ${eyebrow}`}>{data.eyebrow}</div> : null}
      {data.heading ? (
        <h2 className={`font-display text-[32px] font-bold leading-[1.02] tracking-tight md:text-[56px] ${dark ? "text-white" : "text-ink"}`}>{data.heading}</h2>
      ) : null}
      {/* Side-by-side keeps the heavy rule under the headline; stacked uses the full-width divider instead. */}
      {layout === "side" && data.heading && data.subline ? <div className={`border-t-2 ${dark ? "border-white" : "border-ink"}`} /> : null}
      {data.subline ? <p className={`text-[15px] leading-relaxed md:text-lg ${dark ? "text-white/70" : "text-muted"}`}>{data.subline}</p> : null}
    </div>
  );
}

export function MergedCard({ header, layout, color, ctx, partner, partnerId, partnerClass = "" }: {
  header: any; layout: MergeLayout; color: string; ctx: BlockCtx;
  /** The already-rendered block below the header. */
  partner: React.ReactNode; partnerId?: string; partnerClass?: string;
}) {
  const dark = isDarkColor(color);
  const rule = dark ? "border-white/25" : "border-line";
  const embed = layout === "side" ? "embed embed-side" : "embed";
  const head = <MergedHeader data={header} layout={layout} dark={dark} color={color} ctx={ctx} />;

  return (
    <div className={`${shell} ${dark ? "text-white" : "text-ink"}`} style={{ background: color }}>
      {layout === "side" ? (
        <div className="grid md:grid-cols-[42%_58%]">
          <div className="flex flex-col justify-center p-6 md:p-14">{head}</div>
          <div className={`flex flex-col justify-center border-t p-6 md:border-l md:border-t-0 md:p-12 ${rule} ${partnerClass}`}>
            <div id={partnerId} className={embed}>{partner}</div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="px-6 pb-8 pt-6 md:px-14 md:pb-12 md:pt-14">{head}</div>
          <div className={partnerClass}>
            <div className={`mx-6 border-t md:mx-14 ${rule}`} />
            <div className="p-6 md:p-14"><div id={partnerId} className={embed}>{partner}</div></div>
          </div>
        </div>
      )}
    </div>
  );
}
