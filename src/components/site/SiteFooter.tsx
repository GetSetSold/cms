import Link from "next/link";
import { Fragment } from "react";
import type { MobileCtaButton, NavColumn, SiteSettings, SvgAsset } from "@/lib/types";
import { isDarkColor } from "@/lib/color";
import { MobileCtaBarInner } from "./MobileCtaBarInner";
import { Svg } from "./Svg";
import { getSvgs } from "@/lib/cms";

const DESKTOP_COLS: Record<number, string> = { 1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4" };
const BRAND_ROW_TEMPLATE: Record<number, string> = {
  1: "md:[grid-template-columns:1.4fr_repeat(1,1fr)]",
  2: "md:[grid-template-columns:1.4fr_repeat(2,1fr)]",
  3: "md:[grid-template-columns:1.4fr_repeat(3,1fr)]",
  4: "md:[grid-template-columns:1.4fr_repeat(4,1fr)]",
};

/** Aligned-rules divider (desktop): a light vertical rule at half the column height,
 *  vertically centered so it never touches either end, sitting in the middle of
 *  the grid track gap. */
function VRule({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -left-4 bottom-1/4 top-1/4 w-px"
      style={{ background: color }}
    />
  );
}

/** Divider slot (mobile pairs): a flow item instead of an absolutely positioned
 *  rule, so the hairline lands exactly midway between the two columns' content
 *  no matter how wide each column's text is. */
function VSlot({ color }: { color: string }) {
  return (
    <div aria-hidden className="relative w-8 shrink-0 self-stretch">
      <span
        className="absolute bottom-1/4 left-1/2 top-1/4 w-px -translate-x-1/2"
        style={{ background: color }}
      />
    </div>
  );
}

function FooterCol({ col }: { col: NavColumn }) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      {col.heading ? <strong className="text-[#0066CC]">{col.heading}</strong> : null}
      {col.links.map((l) => <Link key={l.href} href={l.href} className="opacity-75 hover:opacity-100">{l.label}</Link>)}
    </div>
  );
}

function pairs<T>(arr: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += 2) out.push(arr.slice(i, i + 2));
  return out;
}

/** Mobile: columns flow in pairs, each pair justified edge-to-edge with the
 *  divider slot between — the hairline is exactly centered on the content. */
function MobilePairs({ cols, divider }: { cols: NavColumn[]; divider: string }) {
  return (
    <>
      {pairs(cols).map((pair, pi) => (
        <div key={pi} className="flex items-stretch justify-between gap-6">
          {pair.map((col, i) => (
            <Fragment key={i}>
              {i > 0 ? <VSlot color={divider} /> : null}
              <FooterCol col={col} />
            </Fragment>
          ))}
        </div>
      ))}
    </>
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
  const brokerageLogo = settings.brokerage?.logo_svg_id
    ? (await getSvgs([settings.brokerage.logo_svg_id]))[settings.brokerage.logo_svg_id]
    : null;
  const socialSize = { xs: "h-7 w-7", sm: "h-9 w-9", md: "h-11 w-11", lg: "h-14 w-14" }[settings.social_links?.size ?? "md"];
  const c = settings.contact ?? {};
  const f = settings.footer ?? { rows: [] };
  const rows = f.rows ?? [];
  const [firstRow, ...restRows] = rows;
  const compact = settings.theme.density === "compact";
  const dcols = f.columns_per_row ?? 4;
  const mcols = f.mobile_columns_per_row ?? 2;
  const divider = f.text ? `${f.text}33` : "rgba(0,102,204,0.25)";
  const rowPad = compact ? "pt-6" : "pt-8";
  const footerDark = !f.bg || isDarkColor(f.bg);
  const footerLogo = logo && footerDark ? { ...logo, markup: liftLogoForDark(logo.markup) } : logo;

  // Brand block: My Office + Brokerage, headers/lines in brand blue (#0066CC).
  const ACCENT = "#0066CC";
  const brandBlock = (
    <div className="flex flex-col gap-5">
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
      {/* My Office */}
      <div className="border-l-2 pl-4" style={{ borderColor: ACCENT }}>
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[1.5px]" style={{ color: ACCENT }}>My Office</div>
        <div className="flex flex-col gap-1.5">
          {c.address ? <p className="opacity-75">{c.address}</p> : null}
          {c.phone ? <a href={`tel:${c.phone}`} className="opacity-75 hover:opacity-100">{c.phone}</a> : null}
          {c.email ? <a href={`mailto:${c.email}`} className="opacity-75 hover:opacity-100">{c.email}</a> : null}
          {c.hours ? <span className="opacity-75">{c.hours}</span> : null}
        </div>
      </div>
      {/* Brokerage */}
      {settings.brokerage?.name ? (
        <div className="border-l-2 pl-4" style={{ borderColor: ACCENT }}>
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[1.5px]" style={{ color: ACCENT }}>Brokerage</div>
          <div className="flex items-center gap-2.5">
            {brokerageLogo ? (
              <Svg asset={brokerageLogo} label={`${settings.brokerage.name} logo`} style={{ width: 32, height: 32 }} />
            ) : null}
            <span className="font-semibold">{settings.brokerage.name}</span>
          </div>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {settings.brokerage.address ? <p className="opacity-75">{settings.brokerage.address}</p> : null}
            {settings.brokerage.phone ? <a href={`tel:${settings.brokerage.phone}`} className="opacity-75 hover:opacity-100">{settings.brokerage.phone}</a> : null}
            {settings.brokerage.email ? <a href={`mailto:${settings.brokerage.email}`} className="opacity-75 hover:opacity-100">{settings.brokerage.email}</a> : null}
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <footer style={{ background: f.bg || undefined, color: f.text || undefined }}>
      <div className={`mx-auto flex max-w-7xl flex-col px-5 md:px-10 ${compact ? "gap-6 pb-20 pt-10 text-[13px] md:pb-8" : "gap-10 pb-28 pt-16 text-[15px] md:pb-12"}`}>
        {/* Row 1: brand block (wider) + this row's columns */}
        <div>
          {/* Desktop: aligned grid, divider centered in the track gap */}
          <div className={`hidden gap-8 md:grid ${BRAND_ROW_TEMPLATE[dcols]}`}>
            {brandBlock}
            {(firstRow ?? []).map((col, i) => (
              <div key={i} className="relative">
                <VRule color={divider} />
                <FooterCol col={col} />
              </div>
            ))}
          </div>
          {/* Mobile: brand full-width, then pairs with truly centered dividers */}
          <div className="flex flex-col gap-8 md:hidden">
            {brandBlock}
            {mcols === 2 ? (
              <MobilePairs cols={firstRow ?? []} divider={divider} />
            ) : (
              (firstRow ?? []).map((col, i) => <FooterCol key={i} col={col} />)
            )}
          </div>
        </div>

        {/* Additional rows: full-width, clean grid of their own — never shares
            a track with the brand block, so column count changes never
            distort neighbouring content the way one shared grid did. */}
        {restRows.map((row, ri) => (
          <div key={ri} className={`border-t ${rowPad}`} style={{ borderColor: divider }}>
            {/* Desktop: aligned grid */}
            <div className={`hidden gap-8 md:grid ${DESKTOP_COLS[dcols]}`}>
              {row.map((col, i) => (
                <div key={i} className="relative">
                  {i % dcols !== 0 ? <VRule color={divider} /> : null}
                  <FooterCol col={col} />
                </div>
              ))}
            </div>
            {/* Mobile: pairs with truly centered dividers */}
            <div className="flex flex-col gap-8 md:hidden">
              {mcols === 2 ? (
                <MobilePairs cols={row} divider={divider} />
              ) : (
                row.map((col, i) => <FooterCol key={i} col={col} />)
              )}
            </div>
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
