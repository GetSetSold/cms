import type { SvgAsset } from "@/lib/types";

/** Renders a library SVG inline so it picks up theme colours. Markup is sanitised on upload and checked by the DB. */
export function Svg({ asset, label, className = "" }: { asset?: SvgAsset | null; label?: string; className?: string }) {
  if (!asset) return null;
  return (
    <div
      className={`svg-box ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      dangerouslySetInnerHTML={{ __html: asset.markup }}
    />
  );
}
