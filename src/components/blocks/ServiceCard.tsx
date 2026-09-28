import { Svg } from "@/components/site/Svg";
import { isDarkColor } from "@/lib/color";
import type { BlockCtx } from "./index";

export type ServiceCardStyle = "solid" | "panel" | "tile";
export const SERVICE_CARD_STYLES: string[] = ["solid", "panel", "tile"];
type Align = "left" | "center" | "right";

const JUSTIFY: Record<Align, string> = { left: "justify-start", center: "justify-center", right: "justify-end" };
const cardShadow = "border-[length:var(--border-card-width)] border-line shadow-[var(--shadow-card)]";

/** One service card. Same stacked structure on phone and desktop — icon, title,
 *  text, then the button at the bottom right — so it never reflows into a row.
 *  Colors come from one decision (the card color), so text/icons always contrast. */
export function ServiceCard({ s, style, align, color, ctx }: {
  s: any; style: ServiceCardStyle; align: Align; color?: string; ctx: BlockCtx;
}) {
  const custom = /^#[0-9a-f]{6}$/i.test(color ?? "") ? color : undefined;
  const fill = custom ?? "var(--color-primary)";
  const dark = isDarkColor(custom ?? ctx.settings.theme?.primary);
  const on = dark ? "#FFFFFF" : "#14142B"; // text/icon color that reads on the card color
  const bordered = ctx.buttonStyle === "bordered";
  const art = s.svg_id ? ctx.svgs[s.svg_id] : null;
  // Recolor the icon both ways: hardcoded fills/strokes (colorOverride) and the
  // theme classes icons use (c-primary / s-primary) via the CSS variables.
  const iconVars = { "--c-primary": on, "--c-accent": on } as React.CSSProperties;
  const icon = (size: string) => art
    ? <Svg asset={art} className={size} style={iconVars} colorOverride={on} />
    : <span aria-hidden className={`block rounded-full border-2 ${size}`} style={{ borderColor: on }} />;

  // The whole card is the link (as in the classic style), so this is a styled
  // <span>, not a nested <a>.
  const onColorCard = style === "solid";
  const btnStyle: React.CSSProperties = onColorCard
    ? bordered ? { border: `1.5px solid ${on}`, color: on } : { background: on, color: fill }
    : bordered ? { border: `1.5px solid ${fill}`, color: dark ? fill : "#14142B" } : { background: fill, color: on };
  const button = s.href ? (
    <div className="mt-auto flex justify-end pt-6">
      <span className="inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold transition group-hover:brightness-95" style={btnStyle}>
        {s.link_label || "Learn more"} <span aria-hidden>→</span>
      </span>
    </div>
  ) : null;

  const title = s.title ? <h3 className="text-2xl font-semibold leading-tight md:text-[28px]">{s.title}</h3> : null;
  const text = (cls: string, css?: React.CSSProperties) =>
    s.text ? <p className={`text-[15px] leading-relaxed md:text-base ${cls}`} style={css}>{s.text}</p> : null;

  if (style === "solid") {
    return (
      <article className="flex h-full min-h-[360px] flex-col gap-6 rounded-[var(--radius-lg)] p-7 md:p-8" style={{ background: fill, color: on }}>
        <div className={`flex ${JUSTIFY[align]}`}>
          <span className="flex h-28 w-28 items-center justify-center rounded-full border md:h-36 md:w-36" style={{ borderColor: `${on}66` }}>
            {icon("h-12 w-12 md:h-14 md:w-14")}
          </span>
        </div>
        <div className="flex flex-col gap-3">{title}{text("", { color: `${on}BF` })}</div>
        {button}
      </article>
    );
  }
  if (style === "panel") {
    return (
      <article className={`flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] bg-white text-ink ${cardShadow}`}>
        <div className={`flex h-40 items-center px-8 md:h-44 ${JUSTIFY[align]}`} style={{ background: fill }}>{icon("h-14 w-14 md:h-16 md:w-16")}</div>
        <div className="flex flex-1 flex-col gap-3 p-7 md:p-8">{title}{text("text-muted")}{button}</div>
      </article>
    );
  }
  return (
    <article className={`flex h-full flex-col gap-5 rounded-[var(--radius-lg)] bg-white p-7 text-ink md:p-8 ${cardShadow}`} style={{ borderTop: `4px solid ${fill}` }}>
      <div className={`flex ${JUSTIFY[align]}`}>
        <span className="flex h-24 w-24 items-center justify-center rounded-[28px] md:h-28 md:w-28" style={{ background: fill }}>{icon("h-11 w-11 md:h-14 md:w-14")}</span>
      </div>
      <div className="flex flex-col gap-3">{title}{text("text-muted")}</div>
      {button}
    </article>
  );
}
