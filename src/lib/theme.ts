import type { SiteSettings } from "@/lib/types";

export const FONT_OPTIONS = [
  "Inter", "Manrope", "Poppins", "Work Sans", "Sora", "Outfit", "Plus Jakarta Sans", "Space Grotesk",
] as const;

const FALLBACK_FONT = "Inter";

/** CSS var overrides for a page's root element, driven by Settings > Branding. */
export function themeVars(settings: SiteSettings): React.CSSProperties {
  const t = settings.theme ?? ({} as SiteSettings["theme"]);
  const font = t.font || FALLBACK_FONT;
  return {
    "--c-primary": t.primary,
    "--c-accent": t.accent,
    "--c-ink": t.ink,
    "--c-ground": t.ground,
    "--font-display": `'${font}', ui-sans-serif, system-ui, sans-serif`,
    "--font-sans": `'${font}', ui-sans-serif, system-ui, sans-serif`,
  } as React.CSSProperties;
}

/** Google Fonts href for the site's selected font (weights cover body through bold headings). */
export function themeFontHref(settings: SiteSettings): string {
  const font = (settings.theme?.font || FALLBACK_FONT).replace(/ /g, "+");
  return `https://fonts.googleapis.com/css2?family=${font}:wght@400;500;600;700;800&display=swap`;
}
