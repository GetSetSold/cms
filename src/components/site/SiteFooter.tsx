import Link from "next/link";
import { Fragment } from "react";
import type { MobileCtaButton, NavColumn, SiteSettings, SvgAsset } from "@/lib/types";
import { isDarkColor } from "@/lib/color";
import { MobileCtaBarInner } from "./MobileCtaBarInner";
import { Svg } from "./Svg";
import { getSvgs } from "@/lib/cms";

/** Divider: absolute-positioned at the exact center of the grid gap.
 *  With equal 1fr columns and wrapping headers, this is the perfect middle.
 *  offset: half the gap (16px for gap-8, 12px for gap-6). */
function VSlot({ color, offset = 16 }: { color: string; offset?: number }) {
  return (
    <span aria-hidden className="pointer-events-none absolute bottom-1/4 top-1/4 w-px" style={{ background: color, left: -offset }} />
  );
}

function FooterCol({ col }: { col: NavColumn }) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-2.5 text-left">
      {col.heading ? <strong className="block w-full leading-[1.15] break-words">{col.heading}</strong> : null}
      {col.links.map((l) => <Link key={l.href} href={l.href} className="opacity-75 hover:opacity-100 leading-[1.35] text-left break-words">{l.label}</Link>)}
    </div>
  );
}

function pairs<T>(arr: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += 2) out.push(arr.slice(i, i + 2));
  return out;
}

/** Mobile: pairs in equal columns, dividers at gap center. Headers wrap. */
function MobilePairs({ cols, divider }: { cols: NavColumn[]; divider: string }) {
  return (
    <>
      {pairs(cols).map((pair, pi) => (
        <div key={pi} className="grid grid-cols-2 gap-6">
          {pair.map((col, i) => (
            <div key={i} className="relative">
              {i > 0 ? <VSlot color={divider} offset={12} /> : null}
              <FooterCol col={col} />
            </div>
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
  const localOfficeLogo = settings.contact?.logo_svg_id
    ? (await getSvgs([settings.contact.logo_svg_id]))[settings.contact.logo_svg_id]
    : null;
  const socialSize = { xs: "h-7 w-7", sm: "h-9 w-9", md: "h-11 w-11", lg: "h-14 w-14" }[settings.social_links?.size ?? "md"];
  const c = settings.contact ?? {};
  const f = settings.footer ?? { rows: [] };
  const rows = f.rows ?? [];
  const [firstRow, ...restRows] = rows;
  const compact = settings.theme.density === "compact";
  const dcols = f.columns_per_row ?? 4;
  const mcols = f.mobile_columns_per_row ?? 2;
  const divider = "var(--c-line)";
  const rowPad = compact ? "pt-6" : "pt-8";
  const footerDark = !f.bg || isDarkColor(f.bg);
  const footerLogo = logo && footerDark ? { ...logo, markup: liftLogoForDark(logo.markup) } : logo;

  // Brand block: Local Office + Brokerage, headers/lines in black (#000000).
  // Local Office pulls name/title/tagline from Contact settings (not hardcoded).
  const ACCENT = "#000000";
  const localName = c.office_name || settings.site_name;
  const localTitle = c.office_title || settings.header?.subline;
  const localTagline = c.office_tagline || f.tagline;
  // Brokerage falls back to agent settings until the brokerage column is populated.
  const brokerageName = settings.brokerage?.name || settings.agent?.brokerage;
  // Brand: logo + name + tagline (slim, left column)
  const brandBlock = (
    <div className="flex flex-col gap-4">
      <Link href="/" className="flex items-center gap-3" aria-label={`${localName} home`}>
        {localOfficeLogo ? (
          <Svg asset={localOfficeLogo} label={`${localName} logo`} style={{ width: compact ? 40 : 48, height: compact ? 40 : 48 }} />
        ) : footerLogo ? (
          <Svg asset={footerLogo} label={`${settings.site_name} logo`} style={{ width: compact ? 40 : 48, height: compact ? 40 : 48 }} />
        ) : null}
        <span className="flex flex-col leading-tight">
          <span className={`font-display ${compact ? "text-xl" : "text-3xl"}`}>{localName}</span>
          {localTitle ? (
            <span className="text-xs opacity-70 md:text-[13px]">{localTitle}</span>
          ) : null}
        </span>
      </Link>
      {localTagline ? <p className="opacity-75">{localTagline}</p> : null}
    </div>
  );

  // Offices: Local Office + Brokerage side-by-side (wide, right of brand)
  const officesBlock = (
    <div className="grid gap-6 sm:grid-cols-2">
      {/* Local Office */}
      <div className="border-l-2 pl-4" style={{ borderColor: ACCENT }}>
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[1.5px]" style={{ color: ACCENT }}>Local Office</div>
        <div className="flex flex-col gap-1.5">
          {c.address ? <p className="opacity-75">{c.address}</p> : null}
          {c.phone ? <a href={`tel:${c.phone}`} className="opacity-75 hover:opacity-100">{c.phone}</a> : null}
          {c.email ? <a href={`mailto:${c.email}`} className="opacity-75 hover:opacity-100">{c.email}</a> : null}
          {c.hours ? <span className="opacity-75">{c.hours}</span> : null}
        </div>
      </div>
      {/* Brokerage */}
      {brokerageName ? (
        <div className="border-l-2 pl-4" style={{ borderColor: ACCENT }}>
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[1.5px]" style={{ color: ACCENT }}>Brokerage</div>
          {brokerageLogo ? (
            <div className="mb-2"><Svg asset={brokerageLogo} label={`${brokerageName} logo`} style={{ width: 120, height: 48 }} /></div>
          ) : null}
          <span className="font-semibold">{brokerageName}</span>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {settings.brokerage?.address ? <p className="opacity-75">{settings.brokerage.address}</p> : null}
            {settings.brokerage?.phone ? <a href={`tel:${settings.brokerage.phone}`} className="opacity-75 hover:opacity-100">{settings.brokerage.phone}</a> : null}
            {settings.brokerage?.email ? <a href={`mailto:${settings.brokerage.email}`} className="opacity-75 hover:opacity-100">{settings.brokerage.email}</a> : null}
          </div>
        </div>
      ) : null}
    </div>
  );

  const topBorder = f.top_border !== false;
  const topBorderColor = f.top_border_color || "var(--c-line)";
  const topBorderWidth = f.top_border_width ?? 1;

  return (
    <footer style={{ background: f.bg || undefined, color: f.text || undefined }}>
      {topBorder ? (
        <div aria-hidden="true" style={{ borderTop: `${topBorderWidth}px solid ${topBorderColor}` }} />
      ) : null}
      <div className={`mx-auto flex max-w-7xl flex-col px-5 md:px-10 ${compact ? "gap-6 pb-20 pt-10 text-[13px] md:pb-8" : "gap-10 pb-28 pt-16 text-[15px] md:pb-12"}`}>
        {/* Top: brand (slim) + offices (wide, two columns) — Option 3 split layout */}
        <div className="grid gap-8 md:grid-cols-[1fr_2fr] md:gap-12">
          {brandBlock}
          {officesBlock}
        </div>

        {/* Unified menu grid: all rows share the same 4 columns so dividers align vertically.
            Horizontal rules are full-width grid items between rows. */}
        <div className={`border-t ${rowPad}`} style={{ borderColor: divider }}>
          {/* Desktop: one grid, all rows */}
          <div className="hidden gap-8 md:grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            {(firstRow ?? []).map((col, i) => (
              <div key={`r0-${i}`} className="relative">
                {i > 0 ? <VSlot color={divider} /> : null}
                <FooterCol col={col} />
              </div>
            ))}
            {restRows.map((row, ri) => (
              <Fragment key={`row-${ri}`}>
                <div className="col-span-4 border-t" style={{ borderColor: divider }} aria-hidden />
                {row.map((col, i) => (
                  <div key={`r${ri + 1}-${i}`} className="relative">
                    {i > 0 ? <VSlot color={divider} /> : null}
                    <FooterCol col={col} />
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
          {/* Mobile: stacked rows, pairs with centered dividers */}
          <div className="flex flex-col gap-8 md:hidden">
            {mcols === 2 ? (
              <MobilePairs cols={firstRow ?? []} divider={divider} />
            ) : (
              (firstRow ?? []).map((col, i) => <FooterCol key={i} col={col} />)
            )}
            {restRows.map((row, ri) => (
              <Fragment key={`mrow-${ri}`}>
                <div className="border-t" style={{ borderColor: divider }} aria-hidden />
                {mcols === 2 ? (
                  <MobilePairs cols={row} divider={divider} />
                ) : (
                  row.map((col, i) => <FooterCol key={i} col={col} />)
                )}
              </Fragment>
            ))}
          </div>
        </div>

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

        <div className="flex flex-col gap-2.5 border-t pt-6 text-sm" style={{ borderColor: divider }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="opacity-75">© {new Date().getFullYear()} {localName}{localTitle ? ` — ${localTitle}` : ""}</span>
            <nav className="flex flex-wrap items-center gap-5" aria-label="Legal">
              <Link href="/disclaimer" className="opacity-75 hover:opacity-100">Disclaimer</Link>
              <Link href="/privacy-policy" className="opacity-75 hover:opacity-100">Privacy Policy</Link>
              <Link href="/terms-and-conditions" className="opacity-75 hover:opacity-100">Terms & Conditions</Link>
            </nav>
          </div>
          <Link href="/login" className="opacity-75 hover:opacity-100">Staff login</Link>
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
