import type { SvgAsset } from "@/lib/types";

/** Renders a library SVG inline so it picks up theme colours. Markup is sanitised on upload and checked by the DB.
 *  `fill` makes the artwork crop to fill its container (like object-fit: cover) — use for cover photos/thumbnails,
 *  not for icons, since cropping would cut off parts of a small icon that's meant to be seen in full.
 *  `colorOverride` forces every colored shape to one color by rewriting the actual fill/stroke attributes in the
 *  markup — this works even for icons that don't use our theme's c-primary/c-accent classes (e.g. icons uploaded
 *  with hardcoded hex fills), unlike a CSS variable, which only affects elements that reference it. */
export function Svg({ asset, label, className = "", style, fill, colorOverride }: { asset?: SvgAsset | null; label?: string; className?: string; style?: React.CSSProperties; fill?: boolean; colorOverride?: string }) {
  if (!asset) return null;
  let markup = fill
    ? asset.markup.replace(/^<svg([^>]*)>/i, (_m, attrs: string) =>
        `<svg${attrs.replace(/\spreserveAspectRatio="[^"]*"/gi, "")} preserveAspectRatio="xMidYMid slice">`)
    : asset.markup;
  if (colorOverride && /^#[0-9a-f]{6}$/i.test(colorOverride)) {
    markup = markup
      .replace(/fill="(?!none")[^"]*"/gi, `fill="${colorOverride}"`)
      .replace(/stroke="(?!none")[^"]*"/gi, `stroke="${colorOverride}"`);
  }
  return (
    <div
      className={`svg-box ${className}`}
      style={style}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
