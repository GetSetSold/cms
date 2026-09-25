import type { SvgAsset } from "@/lib/types";

/** Renders a library SVG inline so it picks up theme colours. Markup is sanitised on upload and checked by the DB. */
/** Renders a library SVG inline so it picks up theme colours. Markup is sanitised on upload and checked by the DB.
 *  `fill` makes the artwork crop to fill its container (like object-fit: cover) — use for cover photos/thumbnails,
 *  not for icons, since cropping would cut off parts of a small icon that's meant to be seen in full. */
export function Svg({ asset, label, className = "", style, fill }: { asset?: SvgAsset | null; label?: string; className?: string; style?: React.CSSProperties; fill?: boolean }) {
  if (!asset) return null;
  const markup = fill
    ? asset.markup.replace(/^<svg([^>]*)>/i, (_m, attrs: string) =>
        `<svg${attrs.replace(/\spreserveAspectRatio="[^"]*"/gi, "")} preserveAspectRatio="xMidYMid slice">`)
    : asset.markup;
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
