import Link from "next/link";
import { Svg } from "@/components/site/Svg";
import { isDarkColor } from "@/lib/color";
import type { BlockCtx } from "./index";

type Item = { svg_id?: string; icon_color?: string; title?: string; text?: string; href?: string; link_label?: string };
type Layout = "simple" | "lines" | "cross" | "bands";
const LAYOUTS: Layout[] = ["simple", "lines", "cross", "bands"];

const wrap = "mx-auto w-full max-w-7xl px-5 md:px-10";
const shell = "overflow-hidden rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line shadow-[var(--shadow-card)]";

/** Every color inside the section comes from one light/dark decision, so a
 *  single custom color (or the layout's default) always leaves readable text. */
function tone(dark: boolean) {
  return dark
    ? { head: "text-white", body: "text-white/75", accent: "text-white", rule: "border-white/25", divide: "divide-white/25", ruleBg: "bg-white/25", iconBox: "border-white/40", icon: "#FFFFFF" as string | undefined }
    : { head: "text-ink", body: "text-muted", accent: "text-primary", rule: "border-line", divide: "divide-line", ruleBg: "bg-line", iconBox: "border-line", icon: undefined as string | undefined };
}
type Tone = ReturnType<typeof tone>;

function Icon({ it, ctx, t, boxed }: { it: Item; ctx: BlockCtx; t: Tone; boxed?: boolean }) {
  const art = it.svg_id ? ctx.svgs[it.svg_id] : null;
  const glyph = art
    ? <Svg asset={art} className="h-7 w-7 md:h-8 md:w-8" colorOverride={it.icon_color || t.icon} />
    : <span aria-hidden className={`block h-6 w-6 rounded-full border-2 border-current ${t.accent}`} />;
  return boxed
    ? <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${t.iconBox}`}>{glyph}</span>
    : <span className="shrink-0">{glyph}</span>;
}

function Cta({ href, label, t, className = "" }: { href: string; label: string; t: Tone; className?: string }) {
  return (
    <Link href={href} className={`inline-flex w-fit items-center gap-1.5 font-semibold ${t.accent} ${className}`}>
      {label} <span aria-hidden>→</span>
    </Link>
  );
}

/** The header half: eyebrow, headline, text, small note under a divider, main link. */
function Intro({ data, t, topRule }: { data: any; t: Tone; topRule?: boolean }) {
  const link = data.link?.label && data.link?.href ? data.link : null;
  return (
    <div className="flex flex-col gap-5">
      {topRule ? <div className={`border-t ${t.rule}`} /> : null}
      {data.eyebrow ? <div className={`text-base font-semibold md:text-lg ${t.accent}`}>{data.eyebrow}</div> : null}
      {data.heading ? <h2 className={`font-display text-[32px] font-bold leading-[1.02] tracking-tight md:text-[56px] ${t.head}`}>{data.heading}</h2> : null}
      {data.text ? <p className={`text-[15px] leading-relaxed md:text-lg ${t.body}`}>{data.text}</p> : null}
      {data.footnote ? (
        <>
          <div className={`border-t ${t.rule}`} />
          <p className={`text-[15px] font-medium leading-relaxed md:text-lg ${t.head}`}>{data.footnote}</p>
        </>
      ) : null}
      {link ? <Cta href={link.href} label={link.label} t={t} className="text-base md:text-xl" /> : null}
    </div>
  );
}

/** Icon + short vertical line + title/description, link on the right (lines & bands layouts). */
function Row({ it, ctx, t }: { it: Item; ctx: BlockCtx; t: Tone }) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-4 px-6 py-7 md:grid-cols-[auto_1fr_auto] md:px-10 md:py-10">
      <div className="flex items-center gap-5">
        <Icon it={it} ctx={ctx} t={t} />
        <span aria-hidden className={`hidden h-11 w-px md:block ${t.ruleBg}`} />
      </div>
      <div className="flex flex-col gap-1.5">
        {it.title ? <h3 className={`text-lg font-semibold md:text-2xl ${t.head}`}>{it.title}</h3> : null}
        {it.text ? <p className={`text-sm leading-relaxed md:text-base ${t.body}`}>{it.text}</p> : null}
      </div>
      {it.href ? <Cta href={it.href} label={it.link_label || "Learn more"} t={t} className="col-span-2 whitespace-nowrap md:col-span-1 md:justify-self-end" /> : null}
    </div>
  );
}

/** One cell of the cross grid: 2 per row, an odd last item spans the full width. */
function Cell({ it, ctx, t, i, n }: { it: Item; ctx: BlockCtx; t: Tone; i: number; n: number }) {
  const spans = n % 2 === 1 && i === n - 1;
  const lastRow = Math.floor(i / 2) === Math.floor((n - 1) / 2);
  const cls = [
    "flex flex-col items-start gap-4 p-7 md:p-10",
    i < n - 1 ? "border-b" : "",
    lastRow ? "md:border-b-0" : "md:border-b",
    i % 2 === 0 && !spans ? "md:border-r" : "",
    spans ? "md:col-span-2" : "",
    t.rule,
  ].join(" ");
  return (
    <div className={cls}>
      <Icon it={it} ctx={ctx} t={t} boxed />
      {it.title ? <h3 className={`text-xl font-semibold md:text-2xl ${t.head}`}>{it.title}</h3> : null}
      {it.text ? <p className={`text-sm leading-relaxed md:text-base ${t.body}`}>{it.text}</p> : null}
      {it.href ? <Cta href={it.href} label={it.link_label || "Learn more"} t={t} /> : null}
    </div>
  );
}

export function FeatureSection({ data, ctx }: { data: any; ctx: BlockCtx }) {
  const layout: Layout = LAYOUTS.includes(data.layout) ? data.layout : "simple";
  const custom: string | undefined = /^#[0-9a-f]{6}$/i.test(data.color ?? "") ? data.color : undefined;
  const items: Item[] = data.items ?? [];
  const outer = ctx.inRow ? "h-full w-full" : `${wrap} py-5 md:py-12`;

  // One custom color colors the WHOLE section (both halves) and drives the
  // text contrast. Without it each layout keeps its own default look.
  const primaryDark = isDarkColor(ctx.settings.theme?.primary);
  const leftDark = custom ? isDarkColor(custom) : layout === "cross" ? primaryDark : layout === "bands";
  const rightDark = custom ? isDarkColor(custom) : layout === "cross" ? primaryDark : false;
  const tl = tone(leftDark), tr = tone(rightDark);
  const fill = custom ?? (layout === "cross" ? "var(--color-primary)" : layout === "bands" ? undefined : "#FFFFFF");

  let body: React.ReactNode;
  if (layout === "simple") {
    body = (
      <div className="grid gap-10 p-6 md:grid-cols-[1.1fr_1fr] md:items-center md:gap-16 md:p-16">
        <Intro data={data} t={tl} />
        <div className={`flex flex-col divide-y border-y ${tr.rule} ${tr.divide}`}>
          {items.map((it, i) => (
            <div key={i} className="flex items-start gap-5 py-6 md:py-8">
              <div className="mt-1"><Icon it={it} ctx={ctx} t={tr} /></div>
              <div className="flex flex-col gap-1.5">
                {it.title ? <h3 className={`text-lg font-semibold md:text-2xl ${tr.head}`}>{it.title}</h3> : null}
                {it.text ? <p className={`text-sm leading-relaxed md:text-base ${tr.body}`}>{it.text}</p> : null}
                {it.href ? <Cta href={it.href} label={it.link_label || "Learn more"} t={tr} className="mt-1 text-[15px]" /> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } else if (layout === "lines") {
    body = (
      <div className="grid md:grid-cols-[40%_60%]">
        <div className="flex flex-col justify-center p-6 md:p-14"><Intro data={data} t={tl} /></div>
        <div className={`flex flex-col divide-y border-t md:border-l md:border-t-0 ${tr.rule} ${tr.divide}`}>
          {items.map((it, i) => <Row key={i} it={it} ctx={ctx} t={tr} />)}
        </div>
      </div>
    );
  } else if (layout === "cross") {
    body = (
      <div className="grid md:grid-cols-[34%_66%]">
        <div className={`flex flex-col justify-center p-6 md:p-12 ${leftDark ? "bg-white/5" : "bg-black/[0.03]"}`}><Intro data={data} t={tl} /></div>
        <div className={`grid grid-cols-1 border-t md:grid-cols-2 md:border-l md:border-t-0 ${tr.rule}`}>
          {items.map((it, i) => <Cell key={i} it={it} ctx={ctx} t={tr} i={i} n={items.length} />)}
        </div>
      </div>
    );
  } else {
    // bands: dark left / light right by default; a custom color makes it one color with a divider
    body = (
      <div className="grid md:grid-cols-[38%_62%]">
        <div className={`flex flex-col p-6 md:p-12 ${custom ? "" : "bg-ink"}`}><Intro data={data} t={tl} topRule /></div>
        <div className={`flex flex-col divide-y ${tr.divide} ${custom ? `border-t md:border-l md:border-t-0 ${tr.rule}` : "bg-soft"}`}>
          {items.map((it, i) => <Row key={i} it={it} ctx={ctx} t={tr} />)}
        </div>
      </div>
    );
  }

  return (
    <div className={outer}>
      <div className={`${shell} ${ctx.inRow ? "h-full" : ""}`} style={fill ? { background: fill } : undefined}>{body}</div>
    </div>
  );
}
