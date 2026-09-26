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

export type BlockCtx = { svgs: Record<string, SvgAsset>; settings: SiteSettings; page?: Page; dark?: boolean; buttonStyle?: "solid" | "bordered" };

/** Text tone that auto-adjusts to the section's background — use instead of
 *  a hardcoded text-muted/text-ink so copy stays readable on dark sections. */
const muted = (ctx: BlockCtx) => (ctx.dark ? "text-ground/75" : "text-muted");
const heading = (ctx: BlockCtx) => (ctx.dark ? "text-ground" : "text-ink");

/** True if a hex color is dark enough to need light text on it — actual
 *  relative-luminance math, not a guess, so a custom color picker (like
 *  icon_card's box background) gets readable text automatically instead of
 *  assuming every custom color is light. */
function isDarkColor(hex?: string): boolean {
  if (!hex) return false;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}
type BlockProps = { data: any; ctx: BlockCtx };

const wrap = "mx-auto w-full max-w-7xl px-5 md:px-10";
const h2 = "font-display font-bold tracking-tight text-[40px] leading-none md:text-[56px]";
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
  const title = (
    <h1 className="font-display font-bold text-[44px] leading-[1.05] tracking-tight md:text-[72px]">
      {data.heading}{" "}
      {data.heading_accent ? <span className={data.heading_accent_color ? "" : "text-primary"} style={data.heading_accent_color ? { color: data.heading_accent_color } : undefined}>{data.heading_accent}</span> : null}
    </h1>
  );
  const copy = (
    <>
      {data.layout === "centered" && data.centered_icon_svg_id && ctx.svgs[data.centered_icon_svg_id] ? (
        <div
          className="flex shrink-0 items-center justify-center overflow-hidden rounded-full shadow-[0_8px_24px_rgba(20,20,43,0.12)]"
          style={{
            width: (Number(data.centered_icon_radius) || 64) * 2,
            height: (Number(data.centered_icon_radius) || 64) * 2,
            padding: 5,
            background: data.centered_icon_bg || "var(--c-icon-bg, #FFFFFF)",
          }}
        >
          <Svg asset={ctx.svgs[data.centered_icon_svg_id]} className="h-full w-full" />
        </div>
      ) : null}
      {data.eyebrow ? <div className={`text-xs uppercase tracking-[0.12em] md:text-[13px] ${dark ? "text-primary/80" : "text-muted"}`}>{data.eyebrow}</div> : null}
      {title}
      {data.subheading ? <p className={`max-w-xl text-[17px] leading-relaxed md:text-[19px] ${dark ? "text-ground/75" : "text-muted"}`}>{data.subheading}</p> : null}
    </>
  );

  if (data.layout === "search") {
    return (
      <div className={`${wrap} flex flex-col gap-6 py-10 md:py-16`}>
        {copy}
        <div className="inline-flex w-fit gap-6 border-b border-line text-[15px]">
          {(data.tabs?.length ? data.tabs : ["Rent", "Buy", "Sell"]).map((t: string, i: number) => (
            <span key={t} className={`-mb-px border-b-2 pb-2.5 ${i === 0 ? "border-primary font-medium text-primary" : "border-transparent text-muted"}`}>{t}</span>
          ))}
        </div>
        <form action="/listings" className="flex w-full flex-col gap-3 rounded-2xl bg-white p-3 shadow-[0_12px_40px_rgba(20,20,43,0.08)] sm:flex-row sm:items-center">
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
      <div className={`${wrap} flex flex-col items-center gap-6 py-16 text-center md:py-24`}>
        {copy}
        <div className="flex flex-wrap justify-center gap-3"><Button link={data.primary_cta} dark={dark} /><Button link={data.secondary_cta} variant="outline" dark={dark} /></div>
      </div>
    );
  }

  if (data.layout === "form") {
    return (
      <div className={`${wrap} grid items-center gap-10 py-12 md:grid-cols-2 md:gap-16 md:py-20`}>
        <div className="flex flex-col gap-6">{copy}</div>
        <div className="rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(21,23,28,0.08)] md:p-8">
          <LeadForm data={{ form_key: "landing", submit_label: data.primary_cta?.label || "Get my quote", show_message: false }} pageId={ctx.page?.id} siteName={ctx.settings.site_name} />
        </div>
      </div>
    );
  }

  const imageOnLeft = data.image_side === "left";
  return (
    <div className={`${wrap} grid items-center gap-10 py-10 md:grid-cols-2 md:gap-16 md:py-20`}>
      <div className={`flex flex-col gap-6 md:gap-7 ${imageOnLeft ? "order-2" : ""}`}>
        {copy}
        <div className="flex flex-col gap-3 sm:flex-row"><Button link={data.primary_cta} dark={dark} /><Button link={data.secondary_cta} variant="outline" dark={dark} /></div>
      </div>
      <div className={`relative ${imageOnLeft ? "order-1" : ""}`}>
        <Svg asset={art} label={art?.name} className="aspect-[600/520] overflow-hidden rounded-3xl" />
        {data.badge?.value ? (() => {
          const size = data.badge_size || "md";
          const sizeCls = { sm: "w-48 p-3.5 gap-0.5", md: "w-64 p-5 gap-1", lg: "w-80 p-6 gap-1.5" }[size as "sm" | "md" | "lg"];
          const valueCls = { sm: "text-2xl", md: "text-4xl", lg: "text-5xl" }[size as "sm" | "md" | "lg"];
          const style = data.badge_style || "solid";
          const styleCls = {
            solid: "bg-white shadow-[0_12px_40px_rgba(21,23,28,0.12)]",
            bordered: "bg-white border-2 border-ink",
            glass: "bg-white/70 backdrop-blur-md shadow-[0_12px_40px_rgba(21,23,28,0.12)]",
          }[style as "solid" | "bordered" | "glass"];
          return (
            <div className={`absolute -bottom-4 flex flex-col rounded-2xl md:bottom-9 ${sizeCls} ${styleCls} ${imageOnLeft ? "right-4 md:-right-8" : "left-4 md:-left-8"}`}>
              <div className="text-[13px] text-muted">{data.badge.label}</div>
              <div className={`font-display font-bold ${valueCls}`}>{data.badge.value}</div>
            </div>
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
  return (
    <div className={`${wrap} flex flex-col gap-8 py-16 md:gap-12 md:py-24`}>
      {data.heading || data.link?.label ? (
        <div className="flex items-end justify-between gap-4">
          {data.heading ? <h2 className={h2}>{data.heading}</h2> : <span />}
          {data.link?.label ? <Link href={data.link.href} className="font-medium text-primary">{data.link.label} →</Link> : null}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3 md:gap-6">
        {(data.items ?? []).map((s: any, i: number) => {
          const card = (
            <article className="flex h-full items-center gap-4 rounded-2xl bg-white p-3 md:flex-col md:items-stretch md:gap-4 md:rounded-[20px] md:p-4">
              <Svg asset={ctx.svgs[s.svg_id]} className="aspect-square w-22 shrink-0 overflow-hidden rounded-xl md:aspect-[360/220] md:w-full" />
              <div className="flex flex-col gap-1.5 md:p-2">
                <h3 className="text-lg font-semibold md:text-[22px]">{s.title}</h3>
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
    <div className={`${wrap} flex flex-col gap-10 py-12 md:py-24`}>
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
          <div className="font-display font-bold text-[44px] leading-none md:text-[56px]">{s.value}</div>
          <div className="text-sm opacity-75 md:text-[15px]">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function Testimonials({ data }: BlockProps) {
  return (
    <div className={`${wrap} flex flex-col gap-8 py-12 md:py-24`}>
      {data.heading ? <h2 className={h2}>{data.heading}</h2> : null}
      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        {(data.items ?? []).map((t: any, i: number) => (
          <figure key={i} className={`flex flex-col justify-between gap-8 rounded-[20px] p-7 md:p-10 ${i % 2 ? "bg-primary text-white" : "bg-white"}`}>
            <blockquote className="font-display font-semibold text-[22px] leading-snug md:text-[26px]">“{t.quote}”</blockquote>
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
  const jsonLd = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: items.map((f: any) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}

function FaqBoxed({ data, ctx }: BlockProps) {
  const items = data.items ?? [];
  if (!items.length) return null;
  const jsonLd = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: items.map((f: any) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <div className={`${wrap} flex flex-col gap-6 py-12 md:py-20`}>
      {data.heading ? <h2 className={`${h2} ${heading(ctx)}`}>{data.heading}</h2> : null}
      <div className="flex flex-col gap-3">
        {items.map((f: any, i: number) => (
          <details key={i} className={`group overflow-hidden rounded-2xl p-6 ${ctx.dark ? "bg-white/10" : "bg-white shadow-[0_2px_10px_rgba(20,20,43,0.05)]"}`} open={i === 0}>
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}

function QaBlock({ data, ctx }: BlockProps) {
  const items = data.items ?? [];
  if (!items.length) return null;
  const jsonLd = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: items.map((f: any) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <div className={`${wrap} flex flex-col gap-10 py-12 md:py-20`}>
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}

function Cta({ data, ctx }: BlockProps) {
  const dark = ctx.dark;
  return (
    <div className={`${wrap} py-12 md:py-16`}>
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

function LeadFormBlock({ data, ctx }: BlockProps) {
  return (
    <div className={`${wrap} grid gap-8 py-16 md:grid-cols-2 md:gap-12 md:py-20`}>
      <div className="flex flex-col gap-4">
        <h2 className={`${h2} ${heading(ctx)}`}>{data.heading}</h2>
        {data.text ? <p className={`text-lg ${muted(ctx)}`}>{data.text}</p> : null}
      </div>
      <LeadForm data={data} pageId={ctx.page?.id} siteName={ctx.settings.site_name} />
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
    <div className={`${wrap} flex flex-col gap-10 py-12 md:py-24`}>
      {data.heading ? <h2 className={`${h2} ${heading(ctx)}`}>{data.heading}</h2> : null}
      <div className="grid gap-4 md:grid-cols-3 md:gap-6">
        {(data.plans ?? []).map((p: any, i: number) => (
          <div key={i} className={`flex flex-col gap-5 rounded-[20px] p-7 ${p.highlight ? "bg-ink text-white" : "bg-white"}`}>
            <div className="text-lg font-semibold">{p.name}</div>
            <div className="font-display font-bold text-5xl">{p.price}<span className="font-sans text-base opacity-70"> {p.period}</span></div>
            <ul className="flex flex-col gap-2 text-[15px]">
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
    <div className={`${wrap} flex flex-col gap-11 py-12 md:py-20`}>
      {data.heading ? <h2 className="font-display text-[32px] font-bold">{data.heading}</h2> : null}
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
  return (
    <div className={`${wrap} grid items-center gap-14 py-16 md:grid-cols-[320px_1fr] md:py-20`}>
      <Svg asset={art} label={art?.name} className="aspect-[8/9] overflow-hidden rounded-3xl" />
      <div className="flex flex-col gap-3.5">
        {data.eyebrow ? <div className="text-xs font-bold uppercase tracking-[0.08em] text-primary">{data.eyebrow}</div> : null}
        <h2 className={`font-display text-[32px] font-bold ${heading(ctx)}`}>{data.name}</h2>
        {data.role ? <div className={`text-[15px] ${muted(ctx)}`}>{data.role}</div> : null}
        {data.bio ? <p className={`max-w-xl text-[15px] leading-relaxed ${muted(ctx)}`}>{data.bio}</p> : null}
        <div className="mt-2 flex gap-3"><Button link={data.primary_cta} dark={ctx.dark} /><Button link={data.secondary_cta} variant="outline" dark={ctx.dark} /></div>
      </div>
    </div>
  );
}

function ServiceAreas({ data, ctx }: BlockProps) {
  const items = data.items ?? [];
  if (!items.length) return null;
  return (
    <div className={`${wrap} flex flex-col gap-6 py-12 md:py-16`}>
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
    <div className={`${wrap} flex flex-col gap-8 py-12 md:py-24`}>
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
    <div className={`${wrap} flex flex-col gap-6 py-12 md:py-20`}>
      {data.heading ? <h2 className={`${h2} ${heading(ctx)}`}>{data.heading}</h2> : null}
      {data.text ? <p className={`max-w-xl text-lg ${muted(ctx)}`}>{data.text}</p> : null}
      <div className="max-w-2xl">
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
        ? "flex h-full w-full flex-col items-start gap-3 rounded-2xl p-6 md:gap-4 md:p-7"
        : "flex h-full w-full flex-col items-start gap-3 py-6 md:gap-4 md:py-10"}
      style={boxed ? { background: resolvedBoxColor || "var(--c-soft)" } : undefined}
    >
      {art ? <Svg asset={art} label={art.name} className="h-10 w-10 md:h-14 md:w-14" style={iconStyle} colorOverride={data.icon_color} /> : null}
      {data.heading ? <h3 className={`text-lg font-semibold md:text-xl ${dark ? "text-ground" : ""}`}>{data.heading}</h3> : null}
      {data.text ? <p className={`text-[15px] leading-relaxed md:text-base ${dark ? "text-ground/75" : "text-muted"}`}>{data.text}</p> : null}
      {data.link?.label ? (
        <Link href={data.link.href} className={`mt-1 inline-flex h-10 items-center rounded-full px-5 text-sm font-medium transition ${btnCls}`}>
          {data.link.label}
        </Link>
      ) : null}
    </div>
  );
}

const STEP_COLS: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2" };

function ProcessSteps({ data, ctx }: BlockProps) {
  const items = data.items ?? [];
  if (!items.length) return null;
  const mobileCols = STEP_COLS[Number(data.mobile_columns) === 2 ? 2 : 1];
  return (
    <div className={`${wrap} flex flex-col gap-8 py-12 md:gap-10 md:py-24`}>
      {data.heading ? <h2 className={`${h2} ${heading(ctx)}`}>{data.heading}</h2> : null}
      <div className={`grid gap-6 md:gap-8 ${mobileCols} md:grid-cols-3`}>
        {items.map((it: any, i: number) => (
          <div key={i} className="flex flex-col gap-2.5 md:gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-base font-bold text-white md:h-11 md:w-11 md:text-lg">{i + 1}</div>
            <h3 className={`text-base font-semibold md:text-lg ${heading(ctx)}`}>{it.title}</h3>
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
            <span className={`text-[15px] leading-relaxed ${heading(ctx)}`}>{it.text}</span>
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
    <div className={`${wrap} flex flex-col gap-6 py-12 md:py-16`}>
      {data.heading ? <h2 className={h2}>{data.heading}</h2> : null}
      <div className="max-w-sm"><ListingCard listing={listing as GridListing} /></div>
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
      className={`flex flex-col gap-3 overflow-hidden rounded-2xl bg-white shadow-[0_4px_16px_rgba(20,20,43,0.05)] ${swipe ? "w-80 shrink-0" : ""}`}>
      <Svg asset={p.cover_svg_id ? ctx.svgs[p.cover_svg_id] : undefined} fill className="aspect-[16/10] overflow-hidden" />
      <div className="flex flex-col gap-2 px-4 pb-4">
        {p.blog_categories?.name ? <span className="text-[11px] font-bold uppercase tracking-wide text-primary">{p.blog_categories.name}</span> : null}
        <h3 className="text-base font-bold leading-snug">{p.title}</h3>
        {p.excerpt ? <p className="line-clamp-2 text-[13px] text-muted">{p.excerpt}</p> : null}
      </div>
    </Link>
  );

  return (
    <div className={`${wrap} flex flex-col gap-6 py-12 md:py-16`}>
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
    <div className={`${wrap} flex flex-col gap-5 py-8 md:py-12`}>
      {data.heading ? <h2 className={`${h2} ${heading(ctx)}`}>{data.heading}</h2> : null}
      <EmbedHtml html={data.html} />
    </div>
  );
}

const SOCIAL_SIZE: Record<string, string> = { xs: "h-6 w-6", sm: "h-8 w-8", md: "h-11 w-11", lg: "h-14 w-14" };

function SocialLinks({ data, ctx }: BlockProps) {
  const items = (data.items ?? []).filter((it: any) => it.svg_id && it.href);
  if (!items.length) return null;
  const size = SOCIAL_SIZE[data.size] || SOCIAL_SIZE.md;
  return (
    <div className={`${wrap} flex flex-col items-center gap-5 py-10 md:py-14`}>
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
  return (
    <div className={`${wrap} flex flex-col gap-4 py-10 md:py-14 ${centered ? "items-center text-center" : "items-start text-left"}`}>
      {data.eyebrow ? <div className="text-base font-extrabold text-accent md:text-lg">{data.eyebrow}</div> : null}
      {data.heading ? <h2 className={`font-display text-3xl font-extrabold md:text-5xl ${heading(ctx)}`}>{data.heading}</h2> : null}
      <div className={`h-px w-full ${ctx.dark ? "bg-white/20" : "bg-line"}`} />
      {data.subline ? <p className={`text-sm font-bold md:text-base ${heading(ctx)}`}>{data.subline}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
export const BLOCKS: Record<string, (p: BlockProps) => React.ReactNode> = {
  hero: Hero,
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
};

const BG: Record<string, string> = {
  default: "",
  muted: "bg-soft/60",
  dark: "bg-gradient-to-br from-ink to-primary text-ground",
  brand: "bg-primary text-white",
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
  const sectionIsDark = st.background === "dark" || st.background === "brand";
  const cls = [BG[st.background ?? "default"], st.hide_on_mobile && "hide-mobile", st.hide_on_desktop && "hide-desktop"]
    .filter(Boolean).join(" ");

  const box = resolveBoxColor(st.box ? (st.box_bg || "white") : undefined);
  // Once content sits on its own box, its contrast depends on the box's
  // color, not the section behind it — the box supersedes the section for
  // this purpose. Without a box, the section's own dark/light state applies
  // exactly as before.
  const blockCtx: BlockCtx = { ...ctx, dark: st.box ? box.dark : sectionIsDark, buttonStyle: st.button_style };

  const content = <Block data={s.data ?? {}} ctx={blockCtx} />;

  return (
    <section key={s.id} id={st.anchor || s.id} className={cls} data-block={s.block_type}>
      {st.box ? (
        <div className={`${wrap} py-8 md:py-12`}>
          <div className="rounded-2xl p-6 md:p-8" style={{ background: box.css }}>{content}</div>
        </div>
      ) : content}
    </section>
  );
}

export function RenderSections({ sections, ctx }: { sections: Section[]; ctx: BlockCtx }) {
  // Group consecutive sections that share a row_id (set in the builder's
  // Style tab) into one CSS-grid row — up to 4 columns on desktop, always
  // 1 column on mobile. Sections without a row_id render individually,
  // exactly as before.
  const groups: Section[][] = [];
  for (const s of sections) {
    const rid = s.settings?.row_id;
    const last = groups[groups.length - 1];
    if (rid && last?.[0]?.settings?.row_id === rid) last.push(s);
    else groups.push([s]);
  }

  return (
    <>
      {groups.map((group, gi) => {
        if (group.length === 1 && !group[0].settings?.row_id) return renderOne(group[0], ctx);
        const cols = group[0].settings?.row_columns ?? Math.min(group.length, 4) as 1 | 2 | 3 | 4;
        return (
          <div key={group[0].id ?? gi} className={`mx-auto w-full max-w-7xl grid grid-cols-1 gap-x-8 gap-y-10 px-5 md:gap-y-8 md:px-10 ${ROW_COLS[cols]}`}>
            {group.map((s) => renderOne(s, ctx))}
          </div>
        );
      })}
    </>
  );
}
