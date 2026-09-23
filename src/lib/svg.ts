// Client-side SVG sanitising for uploads. The database also rejects unsafe markup
// (see the svg_is_safe constraint), so this is the first of two locks.
import DOMPurify from "dompurify";

export function sanitizeSvg(raw: string): string {
  const clean = DOMPurify.sanitize(raw, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ["script", "foreignObject", "image", "use", "a", "style"],
    FORBID_ATTR: ["href", "xlink:href"],
  });
  const trimmed = clean.trim();
  if (!/^<svg[\s>]/i.test(trimmed)) throw new Error("That file is not a valid SVG.");
  // Drop fixed width/height so the SVG scales to its container; keep viewBox.
  return trimmed.replace(/^<svg([^>]*)>/i, (_m, attrs: string) =>
    `<svg${attrs.replace(/\s(width|height)="[^"]*"/gi, "")}>`,
  );
}
