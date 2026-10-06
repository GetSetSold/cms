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

const RADIUS_PRESETS = {
  sharp: { sm: "4px", md: "6px", lg: "8px" },
  soft: { sm: "12px", md: "16px", lg: "20px" }, // matches the look every block was originally built with
  round: { sm: "16px", md: "24px", lg: "32px" },
} as const;

const SHADOW_PRESETS = {
  none: { shadow: "none", borderWidth: "1px" },
  soft: { shadow: "0 8px 24px rgba(20,20,43,0.10)", borderWidth: "0px" },
  crisp: { shadow: "0 1px 3px rgba(20,20,43,0.12)", borderWidth: "0px" },
} as const;

const BUTTON_RADIUS_PRESETS = {
  pill: "999px",
  soft: "12px",
  sharp: "4px",
} as const;

/** CSS var overrides for a page's root element, driven by Settings > Branding.
 *  Set as literal values (not var() references) so they win regardless of
 *  Tailwind's own token defaults — this is what makes runtime theme changes
 *  actually take effect on every themed page. */
export function themeVars(settings: SiteSettings): React.CSSProperties {
  const t = settings.theme ?? ({} as SiteSettings["theme"]);
  const radius = RADIUS_PRESETS[t.radius ?? "soft"];
  const shadow = SHADOW_PRESETS[t.shadow ?? "soft"];
  const btnRadius = BUTTON_RADIUS_PRESETS[t.button_radius ?? "pill"];
  const vars: Record<string, string> = {
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
    // Shape tokens (Settings > Branding > Shape) — every public block that
    // uses a card/box reads these instead of a hardcoded radius/shadow, so
    // switching the preset here changes the whole site's visual language at
    // once. Radius has three sizes since a small icon-card and a big hero
    // panel shouldn't share one number even within the same preset.
    "--radius-sm": radius.sm,
    "--radius-md": radius.md,
    "--radius-lg": radius.lg,
    "--radius-btn": btnRadius,
    "--shadow-card": shadow.shadow,
    "--border-card-width": shadow.borderWidth,
  };
  // Forces the background behind every icon (hero's centered icon circle,
  // icon_card's box) to one color at once, sitewide — distinct from
  // icon_override, which forces the icon's own fill/stroke color instead.
  // Per-instance colors (set directly on a block) still take priority over
  // this, since each component only falls back to var(--c-icon-bg) when its
  // own field is empty.
  if (t.icon_bg_override) vars["--c-icon-bg"] = t.icon_bg_override;
  return vars as React.CSSProperties;
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
