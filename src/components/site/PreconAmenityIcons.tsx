/** Inline SVG icons for pre-con amenities — no external dependency, theme-aware. */
import type { ReactElement } from "react";

function base(path: string, className?: string) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className ?? "h-8 w-8"} aria-hidden="true">
      {path as unknown as React.ReactNode}
    </svg>
  );
}

const ICONS: Record<string, ReactElement> = {
  pool: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-8 w-8" aria-hidden="true">
      <path d="M2 17c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0" />
      <path d="M2 20c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0" />
      <path d="M7 15V6a2 2 0 0 1 4 0" />
    </svg>
  ),
  gym: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-8 w-8" aria-hidden="true">
      <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
    </svg>
  ),
  park: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
      <path d="M12 3 7 11h3l-4 6h12l-4-6h3L12 3z" />
      <path d="M12 17v4" />
    </svg>
  ),
  clubhouse: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
      <path d="M3 11 12 4l9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </svg>
  ),
  playground: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-8 w-8" aria-hidden="true">
      <path d="M4 20 12 4l8 16" />
      <path d="M12 4v16" />
    </svg>
  ),
  trail: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-8 w-8" aria-hidden="true">
      <path d="M4 19c4-1 3-6 7-7s3-6 7-7" strokeDasharray="3 2" />
      <circle cx="4" cy="19" r="1.5" fill="currentColor" />
      <circle cx="20" cy="5" r="1.5" fill="currentColor" />
    </svg>
  ),
  security: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
      <path d="M12 3 5 6v5c0 5 3.4 8.4 7 10 3.6-1.6 7-5 7-10V6l-7-3z" />
      <path d="m9.5 12 2 2 3.5-4" />
    </svg>
  ),
  concierge: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-8 w-8" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
    </svg>
  ),
  default: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
      <path d="m5 12 5 5 9-10" />
    </svg>
  ),
};

const KEYWORDS: [RegExp, string][] = [
  [/pool|swim/i, "pool"],
  [/gym|fitness|exercise/i, "gym"],
  [/park|green|garden/i, "park"],
  [/club|community centre|community center/i, "clubhouse"],
  [/playground|play/i, "playground"],
  [/trail|walking|path/i, "trail"],
  [/secur|gate/i, "security"],
  [/concierge/i, "concierge"],
];

/** Returns an inline SVG for an amenity title, or null if no match (caller falls back to icon_url). */
export function amenityIcon(title: string | null): ReactElement | null {
  if (!title) return null;
  for (const [re, key] of KEYWORDS) {
    if (re.test(title)) return ICONS[key];
  }
  return null;
}

/** Resolve an amenity's icon_url to a renderable element.
 *  Supports: `icon:<name>` (library), `svg:<svg…>` (pasted SVG), plain URL, or null (auto-match by title). */
export function amenityIconFromUrl(iconUrl: string | null, title: string | null): ReactElement | null {
  if (!iconUrl) return amenityIcon(title);
  if (iconUrl.startsWith("icon:")) {
    const key = iconUrl.slice(5);
    return ICONS[key] ?? amenityIcon(title);
  }
  if (iconUrl.startsWith("svg:")) {
    const svg = iconUrl.slice(4);
    return <span className="inline-flex h-8 w-8 items-center justify-center [&>svg]:h-8 [&>svg]:w-8" dangerouslySetInnerHTML={{ __html: svg }} />;
  }
  if (iconUrl.trim().startsWith("<svg")) {
    return <span className="inline-flex h-8 w-8 items-center justify-center [&>svg]:h-8 [&>svg]:w-8" dangerouslySetInnerHTML={{ __html: iconUrl }} />;
  }
  return null; // plain URL — caller renders <img>
}
