import { Fragment } from "react";
import Link from "next/link";
import type { Page, Section, SiteSettings, SvgAsset } from "@/lib/types";
import { Svg } from "@/components/site/Svg";
import { LeadForm } from "./LeadForm";
import { createMlsClient, type GridListing } from "@/lib/mls";
import { ListingCard } from "@/components/listings/ListingCard";
import { CmsFormRenderer } from "./CmsFormRenderer";
import { createClient } from "@/lib/supabase/server";
import type { CmsForm } from "@/lib/types";
import { EmbedHtml } from "./EmbedHtml";
import { getFeaturedListings } from "@/lib/featuredListings";
import { getProjects, getCities, getBuilders, getPreconStats } from "@/lib/precon";
import { PreconGridClient } from "@/components/site/PreconGridClient";
import { getSoldHistory } from "@/lib/soldHistory";
import { ListingCardShell } from "@/components/listings/ListingCardShell";
import { isDarkColor } from "@/lib/color";
import { FeatureSection } from "./FeatureSection";
import { MergedCard } from "./MergedCard";
import { FaqList, FAQ_STYLES, type FaqStyle } from "./FaqList";
import { ServiceCard, SERVICE_CARD_STYLES, type ServiceCardStyle } from "./ServiceCard";

export type BlockCtx = { svgs: Record<string, SvgAsset>; settings: SiteSettings; page?: Page; dark?: boolean; buttonStyle?: "solid" | "bordered"; inRow?: boolean; /** Set when the block sits inside a merged header+block card. */ embedded?: "side" | "stacked"; /** The real background color behind the block when known (custom color, brand, box, merged card) — lets a block check contrast instead of guessing. */ bg?: string };

/** Text tone that auto-adjusts to the section's background — use instead of
 *  a hardcoded text-muted/text-ink so copy stays readable on dark sections. */
const muted = (ctx: BlockCtx) => (ctx.dark ? "text-ground/75" : "text-muted");
const heading = (ctx: BlockCtx) => (ctx.dark ? "text-ground" : "text-ink");

type BlockProps = { data: any; ctx: BlockCtx };

const wrap = "mx-auto w-full max-w-7xl px-5 md:px-10";
const h2 = "font-display font-bold tracking-tight text-[26px] leading-tight md:text-[56px] md:leading-none";
// Shared compact heading size, used everywhere `h2` is — one definition instead of repeating a
// smaller scale at every call site. Site-wide Density (Settings → Branding) drives this.
const h2Compact = "font-display font-semibold tracking-tight text-[22px] leading-snug md:text-[32px] md:leading-tight";
const headingCls = (compact?: boolean) => (compact ? h2Compact : h2);
// Shared card/box shape — reads the site's radius+shadow tokens (Settings >
// Branding > Shape) instead of a hardcoded value, so every card sitewide
// changes together when that setting changes. `cardLg` for large panels
// (feature cards, testimonials), `cardMd` for smaller ones (icon boxes).
const cardShadow = "border-[length:var(--border-card-width)] border-line shadow-[var(--shadow-card)]";
const cardLg = `rounded-[var(--radius-lg)] ${cardShadow}`;
const cardMd = `rounded-[var(--radius-md)] ${cardShadow}`;
const paragraphs = (text?: string) =>
  (text ?? "").split(/\n{2,}/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>);

function Button({ link, variant = "primary", dark }: { link?: { label?: string; href?: string }; variant?: "primary" | "outline"; dark?: boolean }) {
  if (!link?.label || !link?.href) return null;
  const cls = variant === "primary"
    ? dark ? "bg-white text-ink" : "bg-primary text-white"
    : dark ? "border border-ground text-ground" : "border border-ink text-ink";
  return (
    <Link href={link.href} className={`inline-flex h-13 items-center justify-center rounded-full px-7 py-3.5 font-medium ${cls}`}>
      {link.label}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
function Hero({ data, ctx }: BlockProps) {
  const art = data.svg_id ? ctx.svgs[data.svg_id] : null;
  const dark = data.tone === "dark" || !!ctx.dark;
  const compact = ctx.settings.theme.density === "compact";
  const title = (
    <h1 className={compact
      ? "font-display font-bold text-[26px] leading-[1.2] tracking-tight md:text-[44px] md:leading-[1.1]"
      : "font-display font-bold text-[30px] leading-[1.15] tracking-tight md:text-[72px] md:leading-[1.05]"}>
      {data.heading}{" "}
      {data.heading_accent ? <span className={data.heading_accent_color ? "" : "text-primary"} style={data.heading_accent_color ? { color: data.heading_accent_color } : undefined}>{data.heading_accent}</span> : null}
    </h1>
  );
  // Was gated to layout === "centered" only, so Split never showed this icon even when one was set.
  // Now every layout uses the same icon block — Centered is the reference size; Split can optionally
  // use its own size instead (split_icon_radius), since its narrower text column sometimes needs a
  // different one, but falls back to the shared size when that's left blank.
  // `0 || 64` is `64` in JS — 0 is falsy, so a genuine "make it 0" input was silently discarded and
  // replaced with the 64 default. Only an actually-empty field should fall back; an explicit 0 (the
  // smallest possible size) has to be allowed through as-is.
  const parsedRadius = (v: unknown): number | undefined => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const sharedIconRadius = parsedRadius(data.centered_icon_radius) ?? 64;
  const iconRadius = data.layout === "split" ? parsedRadius(data.split_icon_radius) ?? sharedIconRadius : sharedIconRadius;
  const copy = (
    <>
      {data.centered_icon_svg_id && ctx.svgs[data.centered_icon_svg_id] ? (
        <div
          className="flex shrink-0 items-center justify-center overflow-hidden rounded-full shadow-[var(--shadow-card)]"
          style={{
            width: iconRadius * 2,
            height: iconRadius * 2,
            padding: 5,
            background: data.centered_icon_bg || "var(--c-icon-bg, #FFFFFF)",
          }}
        >
          <Svg asset={ctx.svgs[data.centered_icon_svg_id]} className="h-full w-full" />
        </div>
      ) : null}
      {data.eyebrow ? <div className={`text-xs uppercase tracking-[0.12em] md:text-[13px] ${dark ? "text-primary/80" : "text-muted"}`}>{data.eyebrow}</div> : null}
      {title}
      {data.subheading ? <p className={`max-w-xl leading-relaxed ${compact ? "text-sm md:text-[15px]" : "text-sm md:text-[19px]"} ${dark ? "text-ground/75" : "text-muted"}`}>{data.subheading}</p> : null}
    </>
  );

  if (data.layout === "search") {
    return (
      <div className={`${wrap} flex flex-col gap-4 md:gap-6 ${compact ? "py-6 md:py-10" : "py-6 md:py-16"}`}>
        {copy}
        <div className="inline-flex w-fit gap-6 border-b border-line text-[15px]">
          {(data.tabs?.length ? data.tabs : ["Rent", "Buy", "Sell"]).map((t: string, i: number) => (
            <span key={t} className={`-mb-px border-b-2 pb-2.5 ${i === 0 ? "border-primary font-medium text-primary" : "border-transparent text-muted"}`}>{t}</span>
          ))}
        </div>
        <form action="/listings" className={`flex w-full flex-col gap-3 bg-white p-3 sm:flex-row sm:items-center ${cardLg}`}>
          <label className="flex flex-1 flex-col gap-1 px-3 py-1">
            <span className="text-xs text-muted">Location</span>
            <input name="city" placeholder="City or neighbourhood" className="border-0 p-0 text-[15px] outline-none placeholder:text-muted/70" />
          </label>
          <button className="btn-primary h-13 shrink-0 px-7 text-[15px]">{data.primary_cta?.label || "Browse Properties"}</button>
        </form>
        {art ? <Svg asset={art} label={art?.name} className="mt-4 aspect-[16/7] overflow-hidden rounded-3xl" /> : null}
      </div>
    );
  }

  if (data.layout === "centered" || (!art && data.layout !== "form")) {
    return (
      <div className={`${wrap} flex flex-col items-center gap-4 text-center md:gap-6 ${compact ? "py-10 md:py-14" : "py-16 md:py-24"}`}>
        {copy}
        <div className="flex flex-wrap justify-center gap-3"><Button link={data.primary_cta} dark={dark} /><Button link={data.secondary_cta} variant="outline" dark={dark} /></div>
      </div>
    );
  }

  if (data.layout === "form") {
    return (
      <div className={`${wrap} grid items-center gap-10 md:grid-cols-2 md:gap-16 ${compact ? "py-8 md:py-12" : "py-12 md:py-20"}`}>
        <div className="flex flex-col gap-4 md:gap-6">{copy}</div>
        <div className={`bg-white p-6 md:p-8 ${cardLg}`}>
          <LeadForm data={{ form_key: "landing", submit_label: data.primary_cta?.label || "Get my quote", show_message: false }} pageId={ctx.page?.id} siteName={ctx.settings.site_name} />
        </div>
      </div>
    );
  }

  const imageOnLeft = data.image_side === "left";
  // The main Split-layout photo/illustration had no size control at all — it always filled 100% of
  // its grid column. This is the field that actually makes it smaller or larger (the icon-radius
  // fields control a separate, small decorative badge above the eyebrow, not this image).
  const imageSizeRaw = Number(data.image_size);
  const imageSizePct = Number.isFinite(imageSizeRaw) && imageSizeRaw > 0 ? Math.min(imageSizeRaw, 150) : 100;
  return (
    <div className={`${wrap} grid items-center gap-10 md:grid-cols-2 md:gap-16 ${compact ? "py-8 md:py-12" : "py-10 md:py-20"}`}>
      <div className={`flex flex-col gap-4 md:gap-6 ${imageOnLeft ? "order-2" : ""}`}>
        {copy}
        <div className="flex flex-col gap-3 sm:flex-row"><Button link={data.primary_cta} dark={dark} /><Button link={data.secondary_cta} variant="outline" dark={dark} /></div>
      </div>
      {/* Outer div stays at the column's full width always — this is what the badge anchors to, so it
         stays fixed to the actual page edge. The resizable image lives in its own inner div, so
         shrinking or centering the photo (Illustration size) never drags the badge along with it. */}
      <div className={`relative ${imageOnLeft ? "order-1" : ""}`}>
        <div style={{ width: `${imageSizePct}%`, marginLeft: imageSizePct < 100 ? "auto" : undefined, marginRight: imageSizePct < 100 ? "auto" : undefined }}>
          <Svg asset={art} label={art?.name} className="aspect-[600/520] overflow-hidden rounded-3xl" />
        </div>
        {data.badge?.value ? (() => {
          const layout = data.badge_layout || "callout";
          const style = data.badge_style || "solid";
          const styleCls = {
            solid: "bg-white shadow-[var(--shadow-card)]",
            bordered: "bg-white border-2 border-ink",
            glass: "bg-white/70 backdrop-blur-md shadow-[var(--shadow-card)]",
          }[style as "solid" | "bordered" | "glass"];
          // Explicit left/center/right when set; otherwise the original
          // behavior (opposite side from the image) for existing content
          // that never set this.
          const position = data.badge_position || (imageOnLeft ? "right" : "left");
          const icon = data.badge_icon_svg_id ? ctx.svgs[data.badge_icon_svg_id] : null;
          const Wrap = data.badge_href ? Link : "div";
          const wrapProps = data.badge_href ? { href: data.badge_href } : {};

          if (layout === "ribbon") {
            // Compact top-corner pill, flush to the edge — flat on the side
            // that touches the corner, rounded on the outer side, like a
            // dock tab rather than a floating pill. Label (small) then value
            // (bold) reads as one phrase ("Free Home" + "Valuation"), not
            // reversed. One fixed compact size regardless of badge_size.
            const ribbonHorizCls = { left: "left-0", right: "right-0", center: "left-1/2 -translate-x-1/2" }[position as "left" | "right" | "center"];
            const flatSideCls = position === "right" ? "rounded-l-full" : "rounded-r-full";
            return (
              <Wrap {...(wrapProps as any)} className={`absolute top-0 z-10 flex max-w-[calc(100%-1rem)] items-center gap-1.5 py-1 pl-1 pr-1.5 ${flatSideCls} ${styleCls} ${ribbonHorizCls}`}>
                {icon ? (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary">
                    <Svg asset={icon} className="h-3 w-3" colorOverride="#FFFFFF" />
                  </span>
                ) : null}
                <span className="flex min-w-0 flex-col">
                  {data.badge.label ? <span className="truncate text-[9px] text-muted leading-tight">{data.badge.label}</span> : null}
                  <span className="truncate text-xs font-bold leading-tight">{data.badge.value}</span>
                </span>
                {data.badge_href ? (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </span>
                ) : null}
              </Wrap>
            );
          }

          // "callout" — the original floating stat panel at the bottom of the image
          const size = data.badge_size || "md";
          const sizeCls = {
            sm: "w-32 p-2.5 md:w-48 md:p-3.5",
            md: "w-40 p-3 md:w-64 md:p-5",
            lg: "w-48 p-3.5 md:w-80 md:p-6",
          }[size as "sm" | "md" | "lg"];
          const valueCls = {
            sm: "text-lg md:text-2xl",
            md: "text-xl md:text-4xl",
            lg: "text-2xl md:text-5xl",
          }[size as "sm" | "md" | "lg"];
          const vertPosCls = { left: "left-4 md:-left-8", right: "right-4 md:-right-8", center: "left-1/2 -translate-x-1/2" }[position as "left" | "right" | "center"];
          return (
            <Wrap {...(wrapProps as any)} className={`absolute -bottom-4 flex items-center justify-between gap-3 rounded-[var(--radius-lg)] md:bottom-9 ${sizeCls} ${styleCls} ${vertPosCls}`}>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-[11px] text-muted md:text-[13px]">{data.badge.label}</span>
                <span className={`truncate font-display font-bold ${valueCls}`}>{data.badge.value}</span>
              </span>
              {data.badge_href ? (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </span>
              ) : null}
            </Wrap>
          );
        })() : null}
      </div>
    </div>
  );
}

function Logos({ data, ctx }: BlockProps) {
  return (
    <div className={`${wrap} flex flex-col gap-4 border-y border-line py-8 md:flex-row md:items-center md:justify-between`}>
      {data.heading ? <div className={`text-sm ${muted(ctx)}`}>{data.heading}</div> : null}
      <div className={`flex flex-wrap gap-x-12 gap-y-3 text-lg font-semibold md:text-xl ${ctx.dark ? "text-ground/60" : "text-[#6B7079]"}`}>
        {(data.items ?? []).map((l: string, i: number) => <span key={i}>{l}</span>)}
      </div>
    </div>
  );
}

function Services({ data, ctx }: BlockProps) {
  // "classic" (or nothing set) is the original layout, unchanged. The three newer
  // styles are stacked cards that look the same on phone and desktop.
  const cardStyle: ServiceCardStyle | null = SERVICE_CARD_STYLES.includes(data.card_style) ? data.card_style : null;
  const align = ["left", "center", "right"].includes(data.icon_align) ? data.icon_align : "left";
  return (
    <div className={`${wrap} flex flex-col gap-8 py-16 md:gap-12 md:py-24`}>
      {data.heading || data.link?.label ? (
        <div className="flex items-end justify-between gap-4">
          {data.heading ? <h2 className={`${h2} ${heading(ctx)}`}>{data.heading}</h2> : <span />}
          {data.link?.label ? <Link href={data.link.href} className="font-medium text-primary">{data.link.label} →</Link> : null}
        </div>
      ) : null}
      <div className={`grid md:grid-cols-3 md:gap-6 ${cardStyle ? "gap-5" : "gap-4"}`}>
        {(data.items ?? []).map((s: any, i: number) => {
          if (cardStyle) {
            const card = <ServiceCard s={s} style={cardStyle} align={align} color={data.card_color} ctx={ctx} />;
            return s.href ? <Link key={i} href={s.href} className="group block h-full">{card}</Link> : <div key={i} className="h-full">{card}</div>;
          }
          const card = (
            <article className="flex h-full items-center gap-4 rounded-[var(--radius-lg)] bg-white p-3 md:flex-col md:items-stretch md:gap-4 md:p-4">
              <Svg asset={ctx.svgs[s.svg_id]} className="aspect-square w-22 shrink-0 overflow-hidden rounded-[var(--radius-md)] md:aspect-[360/220] md:w-full" />
              <div className="flex flex-col gap-1.5 md:p-2">
                <h3 className="text-base font-semibold md:text-[22px]">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted md:text-base">{s.text}</p>
                {s.href ? (
                  <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-full border border-line px-3.5 py-1.5 text-[13px] font-medium text-primary transition group-hover:bg-primary group-hover:text-white">
                    {s.link_label || "Learn more"} →
                  </span>
                ) : null}
              </div>
            </article>
          );
          return s.href ? <Link key={i} href={s.href} className="group">{card}</Link> : <div key={i}>{card}</div>;
        })}
      </div>
    </div>
  );
}

function Features({ data, ctx }: BlockProps) {
  return (
    <div className={`${wrap} flex flex-col gap-10 py-7 md:py-24`}>
      <div className="flex max-w-2xl flex-col gap-4">
        {data.heading ? <h2 className={`${h2} ${heading(ctx)}`}>{data.heading}</h2> : null}
        {data.intro ? <p className={`text-lg ${muted(ctx)}`}>{data.intro}</p> : null}
      </div>
      <div className="grid gap-8 md:grid-cols-2">
        {(data.items ?? []).map((f: any, i: number) => {
          const art = f.svg_id ? ctx.svgs[f.svg_id] : null;
          const solid = ctx.buttonStyle !== "bordered";
          const btnCls = solid
            ? ctx.dark ? "bg-white text-ink" : "bg-primary text-white"
            : ctx.dark ? "border border-ground text-ground" : "border border-ink text-ink";
          const card = (
            <div className="flex h-full flex-col gap-3">
              {art ? (
                <Svg asset={art} label={art.name} className="h-10 w-10 md:h-14 md:w-14" colorOverride={f.icon_color} />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                </div>
              )}
              <h3 className={`text-xl font-semibold ${heading(ctx)}`}>{f.title}</h3>
              <p className={`leading-relaxed ${muted(ctx)}`}>{f.text}</p>
              {f.href ? (
                <span className={`mt-1 inline-flex h-10 w-fit items-center rounded-full px-5 text-sm font-medium ${btnCls}`}>
                  {f.link_label || "Learn more"} →
                </span>
              ) : null}
            </div>
          );
          return f.href ? <Link key={i} href={f.href} className="group">{card}</Link> : <div key={i}>{card}</div>;
        })}
      </div>
    </div>
  );
}

function Stats({ data }: BlockProps) {
  return (
    <div className={`${wrap} grid grid-cols-2 gap-6 py-10 md:grid-cols-4 md:py-16`}>
      {(data.items ?? []).map((s: any, i: number) => (
        <div key={i} className="flex flex-col gap-1.5">
          <div className="font-display font-bold text-[28px] leading-none md:text-[56px]">{s.value}</div>
          <div className="text-sm opacity-75 md:text-[15px]">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function Testimonials({ data }: BlockProps) {
  return (
    <div className={`${wrap} flex flex-col gap-8 py-7 md:py-24`}>
      {data.heading ? <h2 className={h2}>{data.heading}</h2> : null}
      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        {(data.items ?? []).map((t: any, i: number) => (
          <figure key={i} className={`flex flex-col justify-between gap-8 rounded-[20px] p-7 md:p-10 ${i % 2 ? "bg-primary text-white" : "bg-white"}`}>
            <blockquote className="font-display font-semibold text-base leading-snug md:text-[26px]">“{t.quote}”</blockquote>
            <figcaption className="flex items-center gap-3">
              <svg viewBox="0 0 44 44" className="h-11 w-11" aria-hidden="true">
                <circle cx="22" cy="22" r="22" fill={i % 2 ? "rgba(255,255,255,.25)" : "var(--c-soft)"} />
                <circle cx="22" cy="17" r="7" fill={i % 2 ? "#fff" : "#8A8E97"} />
                <path d="M9 38 C11 29 33 29 35 38" fill={i % 2 ? "#fff" : "#8A8E97"} />
              </svg>
              <div><div className="font-semibold">{t.name}</div><div className="text-sm opacity-75">{t.role}</div></div>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function Faq({ data, ctx }: BlockProps) {
  const items = data.items ?? [];
  // "classic" (or nothing set) is the original heading-left layout, unchanged. The
  // newer styles put the heading on top and use the full width, so they can split
  // into 1–3 columns on desktop (always 1 on phones).
  const style: FaqStyle | null = FAQ_STYLES.includes(data.style) ? data.style : null;
  if (style) {
    // Only complete rows (a question AND an answer) are shown, so what visitors see
    // is exactly what the page's FAQ structured data lists.
    const shown = items.filter((f: any) => String(f?.q ?? "").trim() && String(f?.a ?? "").trim());
    if (!shown.length) return null;
    const columns = Math.min(Math.max(Number(data.columns) || 1, 1), 3);
    return (
      <div className={`${wrap} flex flex-col gap-8 py-10 md:gap-12 md:py-20`}>
        {data.heading ? <h2 className={`${h2} ${heading(ctx)}`}>{data.heading}</h2> : null}
        <FaqList items={shown} style={style} columns={columns} ctx={ctx} />
      </div>
    );
  }
  return (
    <div className={`${wrap} grid gap-8 py-16 md:grid-cols-3 md:gap-16 md:py-20`}>
      <h2 className={`${h2} ${heading(ctx)}`}>{data.heading}</h2>
      <div className="md:col-span-2">
        {items.map((f: any, i: number) => (
          <details key={i} className={`group border-t py-6 last:border-b ${ctx.dark ? "border-white/20" : "border-line"}`}>
            <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium md:text-xl ${heading(ctx)}`}>
              {f.q}<span className="text-2xl transition group-open:rotate-45">+</span>
            </summary>
            <p className={`pt-3 leading-relaxed ${muted(ctx)}`}>{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

function FaqBoxed({ data, ctx }: BlockProps) {
  const items = data.items ?? [];
  if (!items.length) return null;
  return (
    <div className={`${wrap} flex flex-col gap-6 py-7 md:py-20`}>
      {data.heading ? <h2 className={`${h2} ${heading(ctx)}`}>{data.heading}</h2> : null}
      <div className="flex flex-col gap-3">
        {items.map((f: any, i: number) => (
          <details key={i} className={`group overflow-hidden rounded-[var(--radius-lg)] p-6 ${ctx.dark ? "bg-white/10" : `bg-white ${cardShadow}`}`} open={i === 0}>
            <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold ${heading(ctx)}`}>
              {f.q}
              <span className="relative h-5 w-5 shrink-0">
                <span className={`absolute inset-0 flex items-center justify-center text-2xl leading-none transition-transform group-open:rotate-45 ${heading(ctx)}`}>+</span>
              </span>
            </summary>
            <p className={`mt-3 leading-relaxed ${muted(ctx)}`}>{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

function QaBlock({ data, ctx }: BlockProps) {
  const items = data.items ?? [];
  if (!items.length) return null;
  return (
    <div className={`${wrap} flex flex-col gap-10 py-7 md:py-20`}>
      {data.heading ? <h2 className={`${h2} ${heading(ctx)}`}>{data.heading}</h2> : null}
      <div className="flex flex-col gap-8">
        {items.map((f: any, i: number) => (
          // Each pair is a self-contained, fully-visible unit — no accordion —
          // so the question and its direct answer sit together in the DOM
          // exactly as an AI system (or a person) would want to lift and cite
          // them as one block, rather than needing a click to reveal the answer.
          <div key={i} className={`border-l-4 pl-5 ${ctx.dark ? "border-white/30" : "border-primary/30"}`}>
            <h3 className={`text-lg font-bold md:text-xl ${heading(ctx)}`}>{f.q}</h3>
            <p className={`mt-2 leading-relaxed ${muted(ctx)}`}>{f.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Cta({ data, ctx }: BlockProps) {
  const dark = ctx.dark;
  return (
    <div className={`${wrap} py-7 md:py-16`}>
      <div className={`flex flex-col items-start gap-6 rounded-[28px] p-8 md:flex-row md:items-center md:justify-between md:p-14 ${dark ? "bg-white/10 border border-white/20" : "bg-soft"}`}>
        <div className="flex flex-col gap-3">
          <h2 className={`${h2} ${heading(ctx)}`}>{data.heading}</h2>
          {data.text ? <p className={`text-lg ${muted(ctx)}`}>{data.text}</p> : null}
        </div>
        <Button link={data.button} dark={dark} />
      </div>
    </div>
  );
}

// The "Lead Form" block now always renders the real, editable "General Contact" form (Admin →
// Forms) instead of its own hardcoded fields — wherever this block is already placed, it
// automatically picks up whatever that form currently looks like, no page content to update.
// Per-block heading/text still work as the surrounding copy; the form's own submit label,
// success message and fields now come from the form record, not this block's old config fields.
async function LeadFormBlock({ data, ctx }: BlockProps) {
  const supabase = await createClient();
  const { data: form } = await supabase.from("forms").select("*").eq("slug", "general-contact").eq("is_active", true).maybeSingle();
  return (
    <div className={`${wrap} grid gap-8 py-16 md:grid-cols-2 md:gap-12 md:py-20`}>
      <div className="flex flex-col gap-4">
        <h2 className={`${h2} ${heading(ctx)}`}>{data.heading}</h2>
        {data.text ? <p className={`text-lg ${muted(ctx)}`}>{data.text}</p> : null}
      </div>
      {form ? <CmsFormRenderer form={form as CmsForm} pageId={ctx.page?.id} /> : <LeadForm data={data} pageId={ctx.page?.id} siteName={ctx.settings.site_name} />}
    </div>
  );
}

function RichText({ data }: BlockProps) {
  return (
    <div className={`${wrap} flex max-w-3xl flex-col gap-5 py-12 text-lg leading-relaxed md:py-16`}>
      {data.heading ? <h2 className={h2}>{data.heading}</h2> : null}
      {paragraphs(data.body)}
    </div>
  );
}

function TextSvg({ data, ctx }: BlockProps) {
  const right = data.side !== "left";
  return (
    <div className={`${wrap} grid items-center gap-10 py-16 md:grid-cols-2 md:gap-16 md:py-24`}>
      <div className={`flex flex-col gap-5 text-lg leading-relaxed ${muted(ctx)} ${right ? "" : "md:order-2"}`}>
        {data.heading ? <h2 className={`${h2} ${heading(ctx)}`}>{data.heading}</h2> : null}
        {paragraphs(data.body)}
      </div>
      <Svg asset={ctx.svgs[data.svg_id]} label={ctx.svgs[data.svg_id]?.name} className="overflow-hidden rounded-3xl" />
    </div>
  );
}

function Pricing({ data, ctx }: BlockProps) {
  return (
    <div className={`${wrap} flex flex-col gap-10 py-7 md:py-24`}>
      {data.heading ? <h2 className={`${h2} ${heading(ctx)}`}>{data.heading}</h2> : null}
      <div className="grid gap-4 md:grid-cols-3 md:gap-6">
        {(data.plans ?? []).map((p: any, i: number) => (
          <div key={i} className={`flex flex-col gap-5 rounded-[20px] p-7 ${p.highlight ? "bg-ink text-white" : "bg-white"}`}>
            <div className="text-lg font-semibold">{p.name}</div>
            <div className="font-display font-bold text-5xl">{p.price}<span className="font-sans text-base opacity-70"> {p.period}</span></div>
            <ul className="flex flex-col gap-2 text-[13px] md:text-[15px]">
              {String(p.features ?? "").split("\n").filter(Boolean).map((f: string, j: number) => <li key={j}>✓ {f}</li>)}
            </ul>
            {p.cta_label ? (
              <Link href={p.cta_href || "#"} className={`mt-auto flex h-12 items-center justify-center rounded-full font-medium ${p.highlight ? "bg-white text-ink" : "bg-primary text-white"}`}>
                {p.cta_label}
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactInfo({ data, ctx }: BlockProps) {
  const c = ctx.settings.contact ?? {};
  const rows = [["Phone", c.phone, c.phone && `tel:${c.phone}`], ["Email", c.email, c.email && `mailto:${c.email}`], ["Address", c.address], ["Hours", c.hours]]
    .filter((r) => r[1]);
  return (
    <div className={`${wrap} flex flex-col gap-8 py-16`}>
      {data.heading ? <h2 className={`${h2} ${heading(ctx)}`}>{data.heading}</h2> : null}
      <dl className="grid gap-6 md:grid-cols-4">
        {rows.map(([k, v, href]) => (
          <div key={k as string} className="flex flex-col gap-1">
            <dt className={`text-sm ${muted(ctx)}`}>{k}</dt>
            <dd className={`text-lg ${heading(ctx)}`}>{href ? <a href={href as string}>{v}</a> : v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Timeline({ data }: BlockProps) {
  const items = data.items ?? [];
  if (!items.length) return null;
  return (
    <div className={`${wrap} flex flex-col gap-11 py-7 md:py-20`}>
      {data.heading ? <h2 className="font-display text-[24px] md:text-[32px] font-bold">{data.heading}</h2> : null}
      <div className="relative flex flex-col gap-8 md:flex-row md:justify-between">
        <div className="absolute left-[9px] top-2.5 hidden h-0.5 w-full bg-line md:block" />
        {items.map((it: any, i: number) => (
          <div key={i} className="relative flex gap-4 md:w-1/4 md:flex-col md:gap-3.5">
            <div className={`h-5 w-5 shrink-0 rounded-full border-4 border-ground ${i === items.length - 1 ? "bg-ink" : "bg-primary"}`} />
            <div className="flex flex-col gap-1">
              <div className="text-[13px] font-bold text-primary">{it.year}</div>
              <div className="text-sm font-semibold">{it.title}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamProfile({ data, ctx }: BlockProps) {
  const art = data.svg_id ? ctx.svgs[data.svg_id] : null;
  // In the narrow side-by-side merged card there is no room for photo + text in
  // two columns, so the photo goes above the text.
  const stack = ctx.embedded === "side";
  return (
    <div className={`${wrap} grid items-center ${stack ? "gap-8" : "gap-14 py-16 md:grid-cols-[320px_1fr] md:py-20"}`}>
      <Svg asset={art} label={art?.name} className={`aspect-[8/9] overflow-hidden rounded-3xl ${stack ? "w-full max-w-[280px]" : ""}`} />
      <div className="flex flex-col gap-3.5">
        {data.eyebrow ? <div className="text-xs font-bold uppercase tracking-[0.08em] text-primary">{data.eyebrow}</div> : null}
        <h2 className={`font-display text-[24px] md:text-[32px] font-bold ${heading(ctx)}`}>{data.name}</h2>
        {data.role ? <div className={`text-[13px] md:text-[15px] ${muted(ctx)}`}>{data.role}</div> : null}
        {data.bio ? <p className={`max-w-xl text-[13px] md:text-[15px] leading-relaxed ${muted(ctx)}`}>{data.bio}</p> : null}
        <div className="mt-2 flex gap-3"><Button link={data.primary_cta} dark={ctx.dark} /><Button link={data.secondary_cta} variant="outline" dark={ctx.dark} /></div>
      </div>
    </div>
  );
}

function ServiceAreas({ data, ctx }: BlockProps) {
  const items = data.items ?? [];
  if (!items.length) return null;
  return (
    <div className={`${wrap} flex flex-col gap-6 py-7 md:py-16`}>
      {data.heading ? <h2 className={`font-display text-2xl font-bold ${heading(ctx)}`}>{data.heading}</h2> : null}
      <div className="flex flex-wrap gap-2.5">
        {items.map((it: any, i: number) => (
          <Link key={i} href={it.href || `/listings/city/${(it.label ?? "").toLowerCase().trim().replace(/\s+/g, "-")}`} prefetch={false} className="flex h-10 items-center rounded-full bg-ground px-4.5 text-sm font-medium hover:bg-soft">
            {it.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

async function ListingGrid({ data }: BlockProps) {
  const city: string | undefined = data.city || undefined;
  const perRow = [2, 3, 4].includes(Number(data.per_row)) ? Number(data.per_row) : 4;
  const perPage = Number(data.per_page) || 4;
  const cols: Record<number, string> = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" };

  const mls = createMlsClient();
  let query = mls.from("grid").select("*").order("OriginalEntryTimestamp", { ascending: false }).limit(perPage);
  if (city) query = query.eq("City", city);
  const { data: rows } = await query;
  const listings = (rows ?? []) as GridListing[];
  if (!listings.length) return null;

  return (
    <div className={`${wrap} flex flex-col gap-8 py-7 md:py-24`}>
      {data.heading || data.link_label ? (
        <div className="flex items-end justify-between gap-4">
          {data.heading ? <h2 className={h2}>{data.heading}</h2> : <span />}
          <Link href={city ? `/listings/city/${city.toLowerCase().replace(/\s+/g, "-")}` : "/listings"} prefetch={false} className="font-medium text-primary">
            {data.link_label || "View all listings"} →
          </Link>
        </div>
      ) : null}
      <div className={`grid grid-cols-1 gap-5 ${cols[perRow]}`}>
        {listings.map((l) => <ListingCard key={l.ListingKey} listing={l} />)}
      </div>
    </div>
  );
}

async function CustomForm({ data, ctx }: BlockProps) {
  if (!data.form_slug) return null;
  const supabase = await createClient();
  const { data: form } = await supabase.from("forms").select("*").eq("slug", data.form_slug).eq("is_active", true).maybeSingle();
  if (!form) return null;

  return (
    <div className={`${wrap} flex flex-col gap-6 py-7 md:py-20`}>
      {data.heading ? <h2 className={`${h2} ${heading(ctx)}`}>{data.heading}</h2> : null}
      {data.text ? <p className={`max-w-xl text-lg ${muted(ctx)}`}>{data.text}</p> : null}
      <div className={form.layout === "sidebar" ? "w-full" : "max-w-2xl"}>
        <CmsFormRenderer form={form as CmsForm} pageId={ctx.page?.id} />
      </div>
    </div>
  );
}

function IconCard({ data, ctx }: BlockProps) {
  const art = data.svg_id ? ctx.svgs[data.svg_id] : null;
  const boxed = !!data.box;
  // Resolve the actual color this card's box will use, in the same priority
  // the inline style below applies it: a per-card custom color first, then
  // the sitewide "force all icon backgrounds" override, then the default
  // (var(--c-soft), which is always light). Whichever one wins, we check
  // its real luminance — a boxed card isn't automatically light just
  // because it has its own background; that background could itself be dark.
  const resolvedBoxColor = data.box_bg || ctx.settings.theme?.icon_bg_override || null;
  const boxIsDark = boxed && isDarkColor(resolvedBoxColor ?? undefined);
  const dark = boxIsDark || (!boxed && ctx.dark);
  const iconStyle = data.icon_color ? ({ "--c-primary": data.icon_color, "--c-accent": data.icon_color } as React.CSSProperties) : undefined;
  const solid = (data.link_style || ctx.buttonStyle || "solid") !== "bordered";
  const btnCls = solid
    ? dark ? "bg-white text-ink hover:brightness-95" : "bg-primary text-white hover:brightness-110"
    : dark ? "border border-ground text-ground hover:bg-white/10" : "border border-ink text-ink hover:bg-ground";
  return (
    <div
      className={boxed
        ? "flex h-full w-full flex-col items-start gap-3 rounded-[var(--radius-lg)] p-6 md:gap-4 md:p-7"
        : "flex h-full w-full flex-col items-start gap-3 py-6 md:gap-4 md:py-10"}
      style={boxed ? { background: resolvedBoxColor || "var(--c-soft)" } : undefined}
    >
      {art ? <Svg asset={art} label={art.name} className="h-10 w-10 md:h-14 md:w-14" style={iconStyle} colorOverride={data.icon_color} /> : null}
      {data.heading ? <h3 className={`text-lg font-semibold md:text-xl ${dark ? "text-ground" : ""}`}>{data.heading}</h3> : null}
      {data.text ? <p className={`text-[13px] leading-relaxed md:text-base ${dark ? "text-ground/75" : "text-muted"}`}>{data.text}</p> : null}
      {data.link?.label ? (
        <Link href={data.link.href} className={`mt-1 inline-flex h-10 items-center rounded-full px-5 text-sm font-medium transition ${btnCls}`}>
          {data.link.label}
        </Link>
      ) : null}
    </div>
  );
}

const STEP_COLS: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2" };

// Desktop column count follows however many steps there actually are (used to be stuck at a fixed
// 3, which broke a 4-step process into an awkward 3+1 wrap). Static class map, not a template string
// — Tailwind only picks up class names it can see literally in the source. Caps at 6 — beyond that,
// columns get too narrow to read and the admin should split into two rows of steps instead.
const RAIL_DESKTOP_COLS: Record<number, string> = {
  1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4", 5: "md:grid-cols-5", 6: "md:grid-cols-6",
};

/** Matches the approved "guided rail" mock: equal-width bordered columns, a small dot marker above
 *  each number, a large number, title, text. The number's color is editable (defaults to the site's
 *  own primary) since it's the one strong accent color in an otherwise plain layout. */
function ProcessSteps({ data, ctx }: BlockProps) {
  const items = data.items ?? [];
  if (!items.length) return null;
  // Density and the one accent color are site-wide (Settings → Branding), not per-block — so every
  // block that supports compact mode looks consistent automatically, with one lever to change it all.
  const compact = ctx.settings.theme.density === "compact";
  const mobileCols = STEP_COLS[Number(data.mobile_columns) === 2 ? 2 : 1];
  const desktopCols = RAIL_DESKTOP_COLS[Math.min(items.length, 6)];
  // Comfortable mode's numbers use the main brand color, same as before. Compact is deliberately
  // near-monochrome, so it uses the site's separate Accent color instead — the one spot of color.
  const accent = compact ? "var(--color-accent)" : "var(--color-primary)";
  const lineVar = "divide-[var(--fq-line,var(--color-line))]";
  const dotRing = ctx.dark ? "#0b1033" : "#fff";
  const mobileDivide = Number(data.mobile_columns) === 2 ? `divide-x divide-y ${lineVar}` : `divide-y ${lineVar}`;
  const dividerCls = ctx.dark ? "border-white/15" : "border-line";

  if (compact) {
    return (
      <div className={`${wrap} flex flex-col gap-6 py-10 md:py-16`}>
        <div className="flex flex-col gap-2">
          {data.eyebrow ? <div className={`text-[11px] font-semibold uppercase tracking-wide ${muted(ctx)}`}>{data.eyebrow}</div> : null}
          {data.heading ? <h2 className={`text-[22px] font-semibold leading-snug tracking-tight md:text-[28px] ${heading(ctx)}`}>{data.heading}</h2> : null}
          {data.subline ? <p className={`text-sm leading-relaxed ${muted(ctx)}`}>{data.subline}</p> : null}
        </div>
        <div className={`grid border-t ${mobileCols} ${desktopCols} ${mobileDivide} md:divide-y-0 md:divide-x ${dividerCls}`}>
          {items.map((it: any, i: number) => (
            <div key={i} className={`flex flex-col gap-1.5 border-b p-5 ${dividerCls}`}>
              <div className={`text-xs font-semibold [font-variant-numeric:tabular-nums]`} style={{ color: accent }}>{String(i + 1).padStart(2, "0")}</div>
              <h3 className={`text-sm font-semibold leading-snug ${heading(ctx)}`}>{it.title}</h3>
              {it.text ? <p className={`text-[13px] leading-relaxed ${muted(ctx)}`}>{it.text}</p> : null}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`${wrap} flex flex-col gap-8 py-10 md:gap-12 md:py-20`}>
      <div className="flex flex-col gap-3">
        {data.eyebrow ? <div className="text-sm font-semibold uppercase tracking-wide text-primary">{data.eyebrow}</div> : null}
        {data.heading ? <h2 className={`${h2} ${heading(ctx)}`}>{data.heading}</h2> : null}
        {data.subline ? (
          <>
            <div className={`h-px w-full border-t ${dividerCls}`} />
            <p className={`text-lg font-semibold ${heading(ctx)}`}>{data.subline}</p>
          </>
        ) : null}
      </div>
      <div className={`grid border-t border-b ${mobileCols} ${desktopCols} ${mobileDivide} md:divide-y-0 md:divide-x ${dividerCls}`}>
        {items.map((it: any, i: number) => (
          <div key={i} className="relative flex flex-col gap-4 p-6 md:p-9">
            {/* The mock shows this dot at every breakpoint (just repositioned on mobile), not desktop-only. */}
            <span aria-hidden className="absolute -top-[5px] left-6 h-[9px] w-[9px] rounded-full md:left-9" style={{ background: accent, boxShadow: `0 0 0 5px ${dotRing}` }} />
            <div className="font-display text-5xl font-bold leading-none md:text-6xl" style={{ color: accent }}>{String(i + 1).padStart(2, "0")}</div>
            <h3 className={`text-lg font-semibold leading-snug md:text-xl ${heading(ctx)}`}>{it.title}</h3>
            {it.text ? <p className={`text-[15px] leading-relaxed md:text-base ${muted(ctx)}`}>{it.text}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

const DESKTOP_COLS: Record<number, string> = { 1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3" };

function Checklist({ data, ctx }: BlockProps) {
  const items = data.items ?? [];
  if (!items.length) return null;
  const mobileCols = STEP_COLS[Number(data.mobile_columns) === 2 ? 2 : 1];
  const desktopColsN = [2, 3].includes(Number(data.desktop_columns)) ? Number(data.desktop_columns) : 1;
  const desktopCols = DESKTOP_COLS[desktopColsN];
  return (
    <div className={`${wrap} flex flex-col gap-5 py-10 md:gap-6 md:py-16`}>
      {data.heading ? <h2 className={`${h2} ${heading(ctx)}`}>{data.heading}</h2> : null}
      <ul className={`grid gap-3 ${mobileCols} ${desktopCols} ${desktopColsN === 1 ? "max-w-xl" : ""}`}>
        {items.map((it: any, i: number) => (
          <li key={i} className="flex items-start gap-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="11" className="fill-primary" />
              <path d="m7.5 12.5 3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className={`text-[13px] md:text-[15px] leading-relaxed ${heading(ctx)}`}>{it.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Spacer({ data }: BlockProps) {
  const h = Number(data.height) || 0;
  // height:0 + signed margin-top: positive pushes the next section down (adds
  // space), negative pulls it up (reduces space) — same field either way.
  return <div style={{ height: 0, marginTop: h }} aria-hidden="true" />;
}

async function FeaturedListing({ data }: BlockProps) {
  if (!data.listing_key) return null;
  const mls = createMlsClient();
  const { data: listing } = await mls.from("grid").select("*").eq("ListingKey", data.listing_key).maybeSingle();
  if (!listing) return null;
  return (
    <div className={`${wrap} flex flex-col gap-6 py-7 md:py-16`}>
      {data.heading ? <h2 className={h2}>{data.heading}</h2> : null}
      <div className="max-w-sm"><ListingCard listing={listing as GridListing} /></div>
    </div>
  );
}

const SOLD_STATUS_MAP: Record<string, { label: string; tone: "green" | "blue" | "purple" }> = {
  sold: { label: "Sold", tone: "green" },
  leased: { label: "Leased", tone: "blue" },
  purchased: { label: "Purchased", tone: "purple" },
};

async function SoldHistoryGrid({ data }: BlockProps) {
  const count = Number(data.count) || 6;
  const rows = (await getSoldHistory(data.status_filter || undefined)).slice(0, count);
  if (!rows.length) return null;

  return (
    <div className={`${wrap} flex flex-col gap-6 py-7 md:py-16`}>
      <div className="flex items-end justify-between gap-4">
        {data.heading ? <h2 className={h2}>{data.heading}</h2> : <span />}
        <Link href="/sold-history" prefetch={false} className="font-medium text-primary">{data.link_label || "View all"} →</Link>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => {
          const priceLabel = r.status === "leased"
            ? r.price ? `$${r.price.toLocaleString()} / mo` : "Call for price"
            : r.price ? `$${r.price.toLocaleString()}` : "Call for price";
          const status = SOLD_STATUS_MAP[r.status] ?? { label: r.status, tone: "purple" as const };
          return (
            <ListingCardShell
              key={r.id}
              href={r.link ? (r.link.startsWith("http") ? r.link : `https://${r.link}`) : undefined}
              image={r.image_url}
              statusLabel={status.label}
              statusTone={status.tone}
              price={priceLabel}
              address={r.address}
              beds={r.bed}
              baths={r.bath}
              area={r.sqft ? `${r.sqft.toLocaleString()} sqft` : null}
            />
          );
        })}
      </div>
    </div>
  );
}

async function PreconProjectsGrid({ data, ctx }: BlockProps) {
  const [projects, cities, builders, stats] = await Promise.all([
    getProjects(), getCities(), getBuilders(), getPreconStats(),
  ]);
  return (
    <div className={`${wrap} flex flex-col gap-6 py-12 md:py-16`}>
      {data.heading ? <h2 className={h2}>{data.heading}</h2> : null}
      <PreconGridClient
        projects={projects as any} cities={cities} builders={builders} stats={stats}
        showFilters={data.show_filters !== false} showStats={data.show_stats !== false} showMap={data.show_map !== false}
        cashback={ctx.settings.precon_cashback}
      />
    </div>
  );
}

async function FeaturedListingsGrid({ data }: BlockProps) {
  const { order, mlsListings, privateListings } = await getFeaturedListings();
  const count = Number(data.count) || 6;
  const visible = order.slice(0, count);
  if (!visible.length) return null;

  return (
    <div className={`${wrap} flex flex-col gap-6 py-7 md:py-16`}>
      <div className="flex items-end justify-between gap-4">
        {data.heading ? <h2 className={h2}>{data.heading}</h2> : <span />}
        <Link href="/listings" prefetch={false} className="font-medium text-primary">{data.link_label || "View all listings"} →</Link>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((id) => {
          if (mlsListings[id]) return <ListingCard key={id} listing={mlsListings[id]} />;
          const p = privateListings[id];
          return (
            <ListingCardShell
              key={id}
              href={p.href !== "#" ? p.href : undefined}
              image={p.image}
              statusLabel={p.note || "Private"}
              statusTone="purple"
              price={p.priceLabel}
              address={p.address}
              beds={p.bed}
              baths={p.bath}
              area={p.sqft ? `${p.sqft.toLocaleString()} sqft` : null}
            />
          );
        })}
      </div>
    </div>
  );
}

async function BlogGrid({ data, ctx }: BlockProps) {
  const supabase = await createClient();
  const count = Number(data.count) || 3;
  let categoryId: string | undefined;
  if (data.category_slug) {
    const { data: cat } = await supabase.from("blog_categories").select("id").eq("slug", data.category_slug).maybeSingle();
    categoryId = cat?.id;
  }
  let q = supabase.from("blog_posts").select("*, blog_categories(name,slug)")
    .in("status", ["published", "scheduled"]).or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`)
    .order("publish_at", { ascending: false, nullsFirst: false }).limit(count);
  if (categoryId) q = q.eq("category_id", categoryId);
  const { data: posts } = await q;
  if (!posts?.length) return null;

  const swipe = data.layout === "swipe";
  const card = (p: any) => (
    <Link key={p.id} href={`/updates/${p.blog_categories?.slug ?? "post"}/${p.slug}`} prefetch={false}
      className={`flex flex-col gap-3 overflow-hidden bg-white ${cardLg} ${swipe ? "w-80 shrink-0" : ""}`}>
      <Svg asset={p.cover_svg_id ? ctx.svgs[p.cover_svg_id] : undefined} fill className="aspect-[16/10] overflow-hidden" />
      <div className="flex flex-col gap-2 px-4 pb-4">
        {p.blog_categories?.name ? <span className="text-[11px] font-bold uppercase tracking-wide text-primary">{p.blog_categories.name}</span> : null}
        <h3 className="text-base font-bold leading-snug">{p.title}</h3>
        {p.excerpt ? <p className="line-clamp-2 text-[13px] text-muted">{p.excerpt}</p> : null}
      </div>
    </Link>
  );

  return (
    <div className={`${wrap} flex flex-col gap-6 py-7 md:py-16`}>
      <div className="flex items-end justify-between gap-4">
        {data.heading ? <h2 className={h2}>{data.heading}</h2> : <span />}
        <Link href="/updates" prefetch={false} className="font-medium text-primary">{data.link_label || "View all posts"} →</Link>
      </div>
      {swipe ? (
        <div className="-mx-5 flex gap-5 overflow-x-auto px-5 pb-2 md:-mx-10 md:px-10">{posts.map(card)}</div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{posts.map(card)}</div>
      )}
    </div>
  );
}

function CustomCode({ data, ctx }: BlockProps) {
  if (!data.html) return null;
  return (
    <div className={`${wrap} flex flex-col gap-5 py-5 md:py-12`}>
      {data.heading ? <h2 className={`${h2} ${heading(ctx)}`}>{data.heading}</h2> : null}
      <EmbedHtml html={data.html} />
    </div>
  );
}

const SOCIAL_SIZE: Record<string, string> = { xs: "h-6 w-6", sm: "h-8 w-8", md: "h-11 w-11", lg: "h-14 w-14" };

function SocialLinks({ data, ctx }: BlockProps) {
  const perInstance = (data.items ?? []).filter((it: any) => it.svg_id && it.href);
  const global = (ctx.settings.social_links?.items ?? []).filter((it) => it.svg_id && it.href);
  const items = perInstance.length ? perInstance : global;
  if (!items.length) return null;
  const size = SOCIAL_SIZE[data.size || ctx.settings.social_links?.size || "md"] || SOCIAL_SIZE.md;
  return (
    <div className={`${wrap} flex flex-col items-center gap-5 py-6 md:py-14`}>
      {data.heading ? <h2 className={`${h2} text-center text-2xl ${heading(ctx)}`}>{data.heading}</h2> : null}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {items.map((it: any, i: number) => (
          <a key={i} href={it.href} target="_blank" rel="noopener noreferrer" aria-label={it.label || "Social link"}
            className={`flex items-center justify-center overflow-hidden rounded-full bg-white p-2.5 transition hover:scale-105 ${size}`}>
            <Svg asset={ctx.svgs[it.svg_id]} label={it.label} className="h-full w-full" />
          </a>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ data, ctx }: BlockProps) {
  const centered = data.align === "center";
  // When grouped in a row, the row wrapper already supplies the page's
  // edge padding — adding this block's own on top of that (via `wrap`)
  // is what made a grouped instance look narrower than a full-width one.
  const outer = ctx.inRow ? "w-full h-full" : wrap;
  return (
    <div className={`${outer} flex flex-col gap-4 py-6 md:py-14 ${centered ? "items-center text-center" : "items-start text-left"}`}>
      {data.eyebrow ? <div className="text-base font-extrabold text-accent md:text-lg">{data.eyebrow}</div> : null}
      {data.heading ? <h2 className={`font-display text-3xl font-extrabold md:text-5xl ${heading(ctx)}`}>{data.heading}</h2> : null}
      <div className={`h-px w-full ${ctx.dark ? "bg-white/20" : "bg-line"}`} />
      {data.subline ? <p className={`text-sm font-bold md:text-base ${heading(ctx)}`}>{data.subline}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/** "20 Reasons / Phases" — a list of phases, each with a short label + title + description on the
 *  left, and that phase's numbered reason cards filling a 3-column grid to the right. The number
 *  keeps counting up across every phase (01, 02, 03…), not restarting each phase — matching the
 *  approved mock. The left cell's height always matches its row of cards (flex stretch), regardless
 *  of how many reasons a phase has or how long any one card's text runs. */
// Static class strings, not built from a template — Tailwind's build only picks up classes it can
// see literally in the source, so `grid-cols-${n}` would silently produce no CSS.
const REASONS_GRID_CLS: Record<string, string> = {
  "1": "grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0",
  "2": "grid-cols-2 divide-x divide-y divide-line sm:grid-cols-3 sm:divide-y-0",
};

/** "What's included" — a bordered service matrix: icon (with a short underline accent), title,
 *  description and a fixed "Included" status pill per item. Matches the approved dark-editorial mock;
 *  respects the section's own light/dark setting rather than forcing one. Mobile column count is the
 *  same reusable 1/2 choice as Phases & reasons. */
const INCLUDED_GRID_CLS: Record<string, string> = {
  "1": "grid-cols-1 divide-y divide-[var(--fq-line,var(--color-line))]",
  "2": "grid-cols-2 divide-x divide-y divide-[var(--fq-line,var(--color-line))]",
};

function WhatsIncluded({ data, ctx }: BlockProps) {
  const items: any[] = data.items ?? [];
  const mobileCols = INCLUDED_GRID_CLS[data.mobile_columns] ?? INCLUDED_GRID_CLS["2"];
  const lineCls = ctx.dark ? "border-white/15" : "border-line";
  const compact = ctx.settings.theme.density === "compact";
  // Icon color is site-wide (Settings → Branding), not per-block: your brand Primary color normally,
  // and the separate Accent color in compact mode — one consistent choice everywhere, not a setting
  // to repeat on every block. colorOverride needs a literal hex to rewrite fill/stroke attributes
  // directly (for icons with hardcoded colors); these icons use currentColor, so plain CSS is enough.
  const iconColor = compact ? "var(--color-accent)" : "var(--color-primary)";
  return (
    <div className={`${wrap} flex flex-col ${compact ? "gap-6 py-10 md:py-16" : "gap-8 py-10 md:gap-12 md:py-20"}`}>
      <div className="flex flex-col gap-2">
        {data.eyebrow ? <div className={`${compact ? "text-[11px]" : "text-sm"} font-semibold uppercase tracking-wide ${compact ? muted(ctx) : "text-primary"}`}>{data.eyebrow}</div> : null}
        {data.heading ? (compact
          ? <h2 className={`text-[22px] font-semibold leading-snug tracking-tight md:text-[28px] ${heading(ctx)}`}>{data.heading}</h2>
          : <h2 className={`${h2} ${heading(ctx)}`}>{data.heading}</h2>) : null}
        {data.subline ? <p className={compact ? `text-sm leading-relaxed ${muted(ctx)}` : `text-lg font-semibold ${heading(ctx)}`}>{data.subline}</p> : null}
      </div>
      <div className={`grid border-t border-l ${lineCls} sm:grid-cols-3 ${mobileCols} sm:divide-x sm:divide-y-0 divide-[var(--fq-line,var(--color-line))]`}>
        {items.map((it, i) => {
          const icon = it.svg_id ? ctx.svgs[it.svg_id] : null;
          return (
            <div key={i} className={`flex flex-col items-start gap-4 border-r border-b ${compact ? "p-5" : "p-6"} ${lineCls}`}>
              {icon ? (
                <span className={compact ? "flex h-7 w-7 items-center justify-center" : "flex h-9 w-9 items-center justify-center border-b-2"} style={{ color: iconColor, borderColor: iconColor }}>
                  <Svg asset={icon} className={compact ? "h-5 w-5" : "h-7 w-7"} />
                </span>
              ) : null}
              <div className="flex flex-col gap-1.5">
                {it.title ? <div className={`${compact ? "text-sm" : "text-[15px]"} font-semibold leading-snug ${heading(ctx)}`}>{it.title}</div> : null}
                {it.text ? <p className={`text-[13px] leading-relaxed ${muted(ctx)}`}>{it.text}</p> : null}
              </div>
              <span className={`mt-auto inline-flex items-center gap-1.5 rounded-full bg-primary px-3 text-[10px] font-bold text-white ${compact ? "h-[22px]" : "h-[26px]"}`} style={compact ? { background: "var(--color-accent)" } : undefined}>
                <span aria-hidden>✓</span> Included
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PhasedReasons({ data, ctx }: BlockProps) {
  const phases: any[] = data.phases ?? [];
  const mobileCols = REASONS_GRID_CLS[data.mobile_columns] ?? REASONS_GRID_CLS["1"];
  const compact = ctx.settings.theme.density === "compact";
  const accentCls = compact ? "" : "text-primary"; // compact uses an inline accent color instead, see below
  const accentStyle = compact ? { color: "var(--color-accent)" } : undefined;
  let n = 0;
  return (
    <div className={`${wrap} flex flex-col ${compact ? "gap-6 py-10 md:py-16" : "gap-8 py-10 md:gap-12 md:py-20"}`}>
      <div className="flex flex-col gap-2">
        {data.eyebrow ? <div className={`${compact ? "text-[11px]" : "text-sm"} font-semibold uppercase tracking-wide ${compact ? muted(ctx) : "text-primary"}`}>{data.eyebrow}</div> : null}
        {data.heading ? (compact
          ? <h2 className={`text-[22px] font-semibold leading-snug tracking-tight md:text-[28px] ${heading(ctx)}`}>{data.heading}</h2>
          : <h2 className={`${h2} ${heading(ctx)}`}>{data.heading}</h2>) : null}
        {data.subline ? <p className={compact ? `text-sm leading-relaxed ${muted(ctx)}` : `text-lg font-semibold ${heading(ctx)}`}>{data.subline}</p> : null}
      </div>
      <div className={`flex flex-col overflow-hidden ${compact ? "" : "rounded-2xl"} border ${ctx.dark ? "border-white/15" : "border-line"}`}>
        {phases.map((phase, pi) => (
          <div key={pi} className={`flex flex-col sm:flex-row ${pi > 0 ? `border-t ${ctx.dark ? "border-white/15" : "border-line"}` : ""}`}>
            <div className={`flex shrink-0 flex-col gap-2 ${compact ? "p-5" : "p-6"} sm:w-64 sm:border-r ${ctx.dark ? "bg-white/5 border-white/15" : compact ? "border-line" : "bg-soft border-line"}`}>
              {phase.label ? <div className={`text-xs font-bold uppercase tracking-wide ${accentCls}`} style={accentStyle}>{phase.label}</div> : null}
              {phase.title ? <div className={`${compact ? "text-base" : "text-xl"} font-bold ${heading(ctx)}`}>{phase.title}</div> : null}
              {phase.description ? <p className={`text-sm ${muted(ctx)}`}>{phase.description}</p> : null}
            </div>
            <div className={`grid flex-1 ${mobileCols}`}>
              {(phase.reasons ?? []).map((r: any, ri: number) => {
                n += 1;
                return (
                  <div key={ri} className={`flex flex-col gap-1.5 ${compact ? "p-5" : "p-6"}`}>
                    <div className={`text-sm font-bold ${accentCls}`} style={accentStyle}>{String(n).padStart(2, "0")}</div>
                    {r.title ? <div className={`${compact ? "text-sm" : "text-[15px]"} font-semibold leading-snug ${heading(ctx)}`}>{r.title}</div> : null}
                    {r.text ? <p className={`text-[13px] leading-relaxed ${muted(ctx)}`}>{r.text}</p> : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const BLOCKS: Record<string, (p: BlockProps) => React.ReactNode> = {
  hero: Hero,
  phased_reasons: PhasedReasons,
  whats_included: WhatsIncluded,

  logos: Logos,
  services: Services,
  features: Features,
  stats: Stats,
  testimonials: Testimonials,
  faq: Faq,
  cta: Cta,
  lead_form: LeadFormBlock,
  rich_text: RichText,
  text_svg: TextSvg,
  pricing: Pricing,
  contact_info: ContactInfo,
  timeline: Timeline,
  team_profile: TeamProfile,
  service_areas: ServiceAreas,
  listing_grid: ListingGrid,
  custom_form: CustomForm,
  icon_card: IconCard,
  process_steps: ProcessSteps,
  checklist: Checklist,
  spacer: Spacer,
  section_header: SectionHeader,
  featured_listing: FeaturedListing,
  blog_grid: BlogGrid,
  qa_block: QaBlock,
  faq_boxed: FaqBoxed,
  custom_code: CustomCode,
  social_links: SocialLinks,
  featured_listings_grid: FeaturedListingsGrid,
  sold_history_grid: SoldHistoryGrid,
  precon_projects_grid: PreconProjectsGrid,
  feature_section: FeatureSection,
};

const BG: Record<string, string> = {
  default: "",
  muted: "bg-soft/60",
  dark: "bg-gradient-to-br from-ink to-primary text-ground",
  brand: "bg-primary text-white",
  white: "bg-white",
  custom: "",
};

const ROW_COLS: Record<number, string> = { 1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4" };

function resolveBoxColor(box_bg?: string): { css?: string; dark: boolean } {
  if (!box_bg || box_bg === "transparent") return { css: undefined, dark: false };
  if (box_bg === "white") return { css: "#FFFFFF", dark: false };
  return { css: box_bg, dark: isDarkColor(box_bg) };
}

function renderOne(s: Section, ctx: BlockCtx) {
  const Block = BLOCKS[s.block_type];
  if (!Block) return null;
  const st = s.settings ?? {};
  const customBg = st.background === "custom" ? st.background_color : undefined;
  const sectionIsDark = st.background === "dark" || st.background === "brand" || (st.background === "custom" && isDarkColor(customBg));
  const cls = [BG[st.background ?? "default"], st.hide_on_mobile && "hide-mobile", st.hide_on_desktop && "hide-desktop"]
    .filter(Boolean).join(" ");

  // feature_section is its own card (its color option replaces the generic box),
  // so the central background box would only wrap it a second time.
  const boxed = !!st.box && s.block_type !== "feature_section";
  const box = resolveBoxColor(boxed ? (st.box_bg || "white") : undefined);
  // Once content sits on its own box, its contrast depends on the box's
  // color, not the section behind it — the box supersedes the section for
  // this purpose. Without a box, the section's own dark/light state applies
  // exactly as before.
  const theme = ctx.settings.theme;
  const bgHex = boxed ? box.css
    : st.background === "custom" ? customBg
    : st.background === "brand" ? theme?.primary
    : st.background === "dark" ? theme?.ink
    : undefined;
  const blockCtx: BlockCtx = { ...ctx, dark: boxed ? box.dark : sectionIsDark, buttonStyle: st.button_style, bg: bgHex && /^#[0-9a-f]{6}$/i.test(bgHex) ? bgHex : undefined };

  const content = <Block data={s.data ?? {}} ctx={blockCtx} />;

  return (
    <section key={s.id} id={st.anchor || s.id} className={cls} style={customBg ? { background: customBg } : undefined} data-block={s.block_type}>
      {boxed ? (
        ctx.inRow ? (
          <div className={`h-full rounded-[var(--radius-lg)] px-6 py-8 md:px-8 md:py-10 ${cardShadow}`} style={{ background: box.css }}>{content}</div>
        ) : (
          <div className={`${wrap} py-5 md:py-12`}>
            <div className={`rounded-[var(--radius-lg)] p-6 md:p-8 ${cardShadow}`} style={{ background: box.css }}>{content}</div>
          </div>
        )
      ) : content}
    </section>
  );
}

/** A Section Header with "Merge with the block below" on, plus the block under it,
 *  drawn as ONE card. The header's own Background setting still styles the band
 *  around the card; the block below gives up its Background/Box (the card owns them)
 *  but keeps its Button style and visibility. */
function renderMerged(h: Section, p: Section, ctx: BlockCtx) {
  const Block = BLOCKS[p.block_type];
  if (!Block) return <Fragment key={h.id}>{renderOne(h, ctx)}{renderOne(p, ctx)}</Fragment>;
  const hs = h.settings ?? {}, ps = p.settings ?? {};
  const layout = hs.merge_layout === "stacked" ? "stacked" : "side";
  const color = /^#[0-9a-f]{6}$/i.test(hs.merge_color ?? "") ? hs.merge_color! : "#FFFFFF";
  const customBg = hs.background === "custom" ? hs.background_color : undefined;
  const cls = [BG[hs.background ?? "default"], hs.hide_on_mobile && "hide-mobile", hs.hide_on_desktop && "hide-desktop"].filter(Boolean).join(" ");
  const partnerCtx: BlockCtx = { ...ctx, dark: isDarkColor(color), buttonStyle: ps.button_style, inRow: true, embedded: layout, bg: color };
  const partnerCls = [ps.hide_on_mobile && "hide-mobile", ps.hide_on_desktop && "hide-desktop"].filter(Boolean).join(" ");
  return (
    <section key={h.id} id={hs.anchor || h.id} className={cls} style={customBg ? { background: customBg } : undefined} data-block="merged">
      <div className={`${wrap} py-5 md:py-12`}>
        <MergedCard header={h.data ?? {}} layout={layout} color={color} ctx={ctx}
          partner={<Block data={p.data ?? {}} ctx={partnerCtx} />} partnerId={ps.anchor || p.id} partnerClass={partnerCls} />
      </div>
    </section>
  );
}

const FAQ_BLOCK_TYPES = ["faq", "faq_boxed", "qa_block"];

/** One FAQPage for the whole page, built from every FAQ-type block on it. Google wants a
 *  single FAQPage per page (several show up as "duplicate field" errors in Search Console),
 *  rejects entries with an empty question or answer, and expects each question once. */
function faqPageSchema(sections: Section[]) {
  const seen = new Set<string>();
  const mainEntity: any[] = [];
  for (const s of sections) {
    if (!FAQ_BLOCK_TYPES.includes(s.block_type)) continue;
    for (const f of s.data?.items ?? []) {
      const name = String(f?.q ?? "").trim(), text = String(f?.a ?? "").trim();
      const key = name.toLowerCase();
      if (!name || !text || seen.has(key)) continue;
      seen.add(key);
      mainEntity.push({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } });
    }
  }
  return mainEntity.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity } : null;
}

export function RenderSections({ sections, ctx }: { sections: Section[]; ctx: BlockCtx }) {
  // Group consecutive sections that share a row_id (set in the builder's
  // Style tab) into one CSS-grid row — up to 4 columns on desktop, always
  // 1 column on mobile. Sections without a row_id render individually,
  // exactly as before.
  const groups: Section[][] = [];
  const mergedPairs = new Set<Section[]>();
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i], next = sections[i + 1];
    // A merging Section Header takes the block right below it — unless either one
    // is part of a row group, which always wins (rows and merges don't combine).
    if (s.block_type === "section_header" && s.settings?.merge_next && !s.settings?.row_id && next && !next.settings?.row_id) {
      const pair = [s, next];
      groups.push(pair); mergedPairs.add(pair);
      i++;
      continue;
    }
    const rid = s.settings?.row_id;
    const last = groups[groups.length - 1];
    if (rid && !mergedPairs.has(last) && last?.[0]?.settings?.row_id === rid) last.push(s);
    else groups.push([s]);
  }

  const faqLd = faqPageSchema(sections);
  return (
    <>
      {groups.map((group, gi) => {
        if (mergedPairs.has(group)) return renderMerged(group[0], group[1], ctx);
        if (group.length === 1 && !group[0].settings?.row_id) return renderOne(group[0], ctx);
        const cols = group[0].settings?.row_columns ?? Math.min(group.length, 4) as 1 | 2 | 3 | 4;
        return (
          <div key={group[0].id ?? gi} className={`mx-auto w-full max-w-7xl grid grid-cols-1 gap-x-8 gap-y-10 px-5 md:gap-y-8 md:px-10 ${ROW_COLS[cols]}`}>
            {group.map((s) => renderOne(s, { ...ctx, inRow: true }))}
          </div>
        );
      })}
      {faqLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} /> : null}
    </>
  );
}
