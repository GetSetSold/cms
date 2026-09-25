import type { SiteSettings } from "@/lib/types";

export const FONT_OPTIONS = [
  "Inter", "Manrope", "Poppins", "Work Sans", "Sora", "Outfit", "Plus Jakarta Sans", "Space Grotesk",
] as const;

const FALLBACK = "Inter";

function headingFont(settings: SiteSettings) {
  return settings.theme?.font_heading || settings.theme?.font || FALLBACK;
}
function bodyFont(settings: SiteSettings) {
  return settings.theme?.font_body || settings.theme?.font || FALLBACK;
}

/** CSS var overrides for a page's root element, driven by Settings > Branding.
 *  Set as literal values (not var() references) so they win regardless of
 *  Tailwind's own token defaults — this is what makes runtime theme changes
 *  actually take effect on every themed page. */
export function themeVars(settings: SiteSettings): React.CSSProperties {
  const t = settings.theme ?? ({} as SiteSettings["theme"]);
  return {
    "--c-primary": t.primary,
    "--c-accent": t.accent,
    "--c-ink": t.ink,
    "--c-ground": t.ground,
    // Tailwind's bg-primary/text-primary/etc. compile to `var(--color-primary)`,
    // and --color-primary is itself declared as `var(--c-primary)` at :root in
    // the @theme block. CSS custom properties resolve var() once at the
    // declaring element, then inherit that resolved value — they don't
    // re-follow the reference at each descendant. So overriding --c-primary
    // alone never reaches --color-primary; it has to be set directly too.
    "--color-primary": t.primary,
    "--color-accent": t.accent,
    "--color-ink": t.ink,
    "--color-ground": t.ground,
    "--font-display": `'${headingFont(settings)}', ui-sans-serif, system-ui, sans-serif`,
    "--font-sans": `'${bodyFont(settings)}', ui-sans-serif, system-ui, sans-serif`,
  } as React.CSSProperties;
}

/** Google Fonts href covering both the heading and body font (deduped if they're the same). */
export function themeFontHref(settings: SiteSettings): string {
  const families = [...new Set([headingFont(settings), bodyFont(settings)])]
    .map((f) => `family=${f.replace(/ /g, "+")}:wght@400;500;600;700;800`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

/** Optional CSS to force every icon's accent colors to one value at once
 *  (Settings > Branding > "Force all icon colors"). Scoped to `.svg-box`
 *  (our icon wrapper class) so it only ever touches icon fills/strokes —
 *  buttons use Tailwind's own bg-primary/text-primary classes, a completely
 *  different selector family, so they're untouched by this override. */
export function themeIconOverrideCSS(settings: SiteSettings): string {
  const color = settings.theme?.icon_override;
  if (!color) return "";
  return `.svg-box .c-primary,.svg-box .s-primary{fill:${color};stroke:${color}}.svg-box .c-accent,.svg-box .s-accent{fill:${color};stroke:${color}}`;
}
