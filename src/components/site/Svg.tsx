import type { SvgAsset } from "@/lib/types";

/** Renders a library SVG inline so it picks up theme colours. Markup is sanitised on upload and checked by the DB. */
export function Svg({ asset, label, className = "", style }: { asset?: SvgAsset | null; label?: string; className?: string; style?: React.CSSProperties }) {
  if (!asset) return null;
  return (
    <div
      className={`svg-box ${className}`}
      style={style}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      dangerouslySetInnerHTML={{ __html: asset.markup }}
    />
  );
}
