import Link from "next/link";
import type { MobileCtaButton, SiteSettings, SvgAsset } from "@/lib/types";
import { isDarkColor } from "@/lib/color";
import { MobileCtaBarInner } from "./MobileCtaBarInner";
import { Svg } from "./Svg";
import { getSvgs } from "@/lib/cms";

const DESKTOP_COLS: Record<number, string> = { 1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4" };
const MOBILE_COLS: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2" };

const BRAND_ROW_TEMPLATE: Record<number, string> = {
  1: "md:[grid-template-columns:1.4fr_repeat(1,1fr)]",
  2: "md:[grid-template-columns:1.4fr_repeat(2,1fr)]",
  3: "md:[grid-template-columns:1.4fr_repeat(3,1fr)]",
  4: "md:[grid-template-columns:1.4fr_repeat(4,1fr)]",
};

/** Aligned-rules divider: a light vertical rule at half the column height, vertically
 *  centered so it never touches either end. Rendered per breakpoint because the
 *  "first column in a visual row" differs between the mobile and desktop grids. */
function VRule({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute -left-4 bottom-1/4 top-1/4 w-px ${className ?? ""}`}
      style={{ background: color }}
    />
  );
}

/** The footer is dark, so force the logo to white + light grey to stand on it:
 *  near-black shapes become white, mid-greys become light grey; light and
 *  brand colors are left alone. Only applied while the footer background
 *  itself is dark. */
function liftLogoForDark(markup: string): string {
  const lift = (hex: string): string => {
    const h = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
    const n = parseInt(h.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    if (lum < 0.3) return "#FFFFFF";
    if (lum < 0.62) return "#D4D4D4";
    return hex;
  };
  return markup.replace(/(fill|stroke)="(#(?:[0-9a-f]{6}|[0-9a-f]{3}))"/gi,
    (_m: string, attr: string, hex: string) => `${attr}="${lift(hex)}"`);
}

export async function SiteFooter({ settings, logo }: { settings: SiteSettings; logo?: SvgAsset | null }) {
  const socialItems = (settings.social_links?.items ?? []).filter((it) => it.svg_id && it.href);
  const socialSvgs = await getSvgs(socialItems.map((it) => it.svg_id));
  const socialSize = { xs: "h-7 w-7", sm: "h-9 w-9", md: "h-11 w-11", lg: "h-14 w-14" }[settings.social_links?.size ?? "md"];
  const c = settings.contact ?? {};
  const f = settings.footer ?? { rows: [] };
  const rows = f.rows ?? [];
  const [firstRow, ...restRows] = rows;
  const compact = settings.theme.density === "compact";
  const dcols = f.columns_per_row ?? 4;
  const mcols = f.mobile_columns_per_row ?? 2;
  const divider = f.text ? `${f.text}33` : "rgba(255,255,255,0.18)";
  const rowPad = compact ? "pt-6" : "pt-8";
  const footerDark = !f.bg || isDarkColor(f.bg);
  const footerLogo = logo && footerDark ? { ...logo, markup: liftLogoForDark(logo.markup) } : logo;

  return (
    <footer style={{ background: f.bg || undefined, color: f.text || undefined }}>
      <div className={`mx-auto flex max-w-7xl flex-col px-5 md:px-10 ${compact ? "gap-6 pb-20 pt-10 text-[13px] md:pb-8" : "gap-10 pb-28 pt-16 text-[15px] md:pb-12"}`}>
        {/* Row 1: brand block (wider) + this row's columns */}
        <div className={`grid gap-8 ${MOBILE_COLS[mcols]} ${BRAND_ROW_TEMPLATE[dcols]}`}>
          <div className="col-span-2 flex flex-col gap-3 md:col-span-1">
            <Link href="/" className="flex items-center gap-3" aria-label={`${settings.site_name} home`}>
              {footerLogo ? (
                <Svg asset={footerLogo} label={`${settings.site_name} logo`} style={{ width: compact ? 40 : 48, height: compact ? 40 : 48 }} />
              ) : null}
              <span className="flex flex-col leading-tight">
                <span className={`font-display ${compact ? "text-xl" : "text-3xl"}`}>{settings.site_name}</span>
                {settings.header?.subline ? (
                  <span className="text-xs opacity-70 md:text-[13px]">{settings.header.subline}</span>
                ) : null}
              </span>
            </Link>
            {f.tagline ? <p className="opacity-75">{f.tagline}</p> : null}
            {c.address ? <p className="opacity-75">{c.address}</p> : null}
            <div className="mt-1 flex flex-col gap-1.5">
              {c.phone ? <a href={`tel:${c.phone}`} className="opacity-75 hover:opacity-100">{c.phone}</a> : null}
              {c.email ? <a href={`mailto:${c.email}`} className="opacity-75 hover:opacity-100">{c.email}</a> : null}
              {c.hours ? <span className="opacity-75">{c.hours}</span> : null}
            </div>
          </div>
          {(firstRow ?? []).map((col, i) => (
            <div key={i} className="relative flex flex-col gap-2.5">
              <VRule color={divider} className="hidden md:block" />
              {mcols === 2 && i % 2 !== 0 ? <VRule color={divider} className="md:hidden" /> : null}
              {col.heading ? <strong>{col.heading}</strong> : null}
              {col.links.map((l) => <Link key={l.href} href={l.href} className="opacity-75 hover:opacity-100">{l.label}</Link>)}
            </div>
          ))}
        </div>

        {/* Additional rows: full-width, clean grid of their own — never shares
            a track with the brand block, so column count changes never
            distort neighbouring content the way one shared grid did. */}
        {restRows.map((row, ri) => (
          <div key={ri} className={`grid gap-8 border-t ${rowPad} ${MOBILE_COLS[mcols]} ${DESKTOP_COLS[dcols]}`} style={{ borderColor: divider }}>
            {row.map((col, i) => (
              <div key={i} className="relative flex flex-col gap-2.5">
                {i % dcols !== 0 ? <VRule color={divider} className="hidden md:block" /> : null}
                {mcols === 2 && i % 2 !== 0 ? <VRule color={divider} className="md:hidden" /> : null}
                {col.heading ? <strong>{col.heading}</strong> : null}
                {col.links.map((l) => <Link key={l.href} href={l.href} className="opacity-75 hover:opacity-100">{l.label}</Link>)}
              </div>
            ))}
          </div>
        ))}

        {socialItems.length ? (
          <div className="flex flex-wrap items-center justify-center gap-3 border-t pt-6" style={{ borderColor: divider }}>
            {socialItems.map((it, i) => (
              <a key={i} href={it.href} target="_blank" rel="noopener noreferrer" aria-label={it.label || "Social link"}
                className={`flex items-center justify-center overflow-hidden rounded-full bg-white p-2 transition hover:scale-105 ${socialSize}`}>
                <Svg asset={socialSvgs[it.svg_id]} label={it.label} className="h-full w-full" />
              </a>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-2.5 border-t pt-6 text-sm opacity-75" style={{ borderColor: divider }}>
          <span>© {new Date().getFullYear()} {settings.site_name}</span>
          <Link href="/login" className="hover:opacity-100">Staff login</Link>
        </div>
      </div>
    </footer>
  );
}

function ctaHref(btn: MobileCtaButton, phone?: string) {
  if (btn.type === "call") return `tel:${btn.href || phone || ""}`;
  if (btn.type === "sms") return `sms:${btn.href || phone || ""}`;
  return btn.href || "#";
}

/** Sticky bottom bar on phones — up to 3 configurable buttons (Settings > Mobile bar).
 *  Server wrapper: resolves any custom icon SVGs from the library, then hands off to a
 *  client component for the active-route-aware part — keeps the same {settings} prop
 *  everywhere it's already used, so no page call sites need to change. */
export async function MobileCtaBar({ settings }: { settings: SiteSettings }) {
  const cfg = settings.mobile_cta ?? { buttons: [], shape: "rectangle" as const, size: "md" as const };
  const buttons = (cfg.buttons ?? []).slice(0, 5);
  if (!buttons.length) return null;

  const svgIds = buttons.map((b) => b.icon_svg_id).filter((id): id is string => !!id);
  let svgMarkup: Record<string, string> = {};
  if (svgIds.length) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase.from("svg_assets").select("id,markup").in("id", svgIds);
    svgMarkup = Object.fromEntries((data ?? []).map((s) => [s.id, s.markup as string]));
  }

  const resolved = buttons.map((btn) => ({
    label: btn.label,
    href: ctaHref(btn, settings.contact?.phone),
    iconSvgMarkup: btn.icon_svg_id ? svgMarkup[btn.icon_svg_id] : undefined,
    iconPreset: btn.icon,
  }));

  return <MobileCtaBarInner buttons={resolved} shape={cfg.shape ?? "rectangle"} size={cfg.size ?? "md"} layout={cfg.layout ?? "plain"} style={cfg.style ?? "buttons"} barBg={cfg.bar_bg ?? "light"} />;
}
