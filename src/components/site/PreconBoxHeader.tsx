"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export type PreconCrumb = { label: string; href?: string };
export type PreconFact = { value: string; label?: string };
export type PreconCta = { label: string; href: string; variant: "primary" | "ghost" };

const wrap = "mx-auto w-full max-w-7xl px-5 md:px-10";

/** Contained box-style page header: background image(s) + dark scrim, never full-width.
 *  Pass several `bgImages` and the background crossfades between them automatically.
 *  Breadcrumb renders below the hero (not overlaid) via the `crumbs` prop. */
export function PreconBoxHeader({
  crumbs,
  eyebrow,
  title,
  lede,
  facts,
  ctas,
  bgImage,
  bgImages,
  logoUrl,
  logoAlt,
  strongScrim,
}: {
  crumbs: PreconCrumb[];
  eyebrow: string;
  title: string;
  lede?: React.ReactNode;
  facts?: PreconFact[];
  ctas?: PreconCta[];
  bgImage?: string | null;
  bgImages?: (string | null | undefined)[];
  logoUrl?: string | null;
  logoAlt?: string;
  /** Darker overlay for light/white background images (e.g. floorplans). */
  strongScrim?: boolean;
}) {
  const images = ((bgImages?.filter(Boolean) as string[]) ?? []).length
    ? (bgImages!.filter(Boolean) as string[])
    : bgImage
      ? [bgImage]
      : [];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % images.length), 6000);
    return () => clearInterval(t);
  }, [images.length]);

  return (
    <div className={`${wrap} pt-6 md:pt-8`}>
      <header className="relative flex min-h-[420px] items-center overflow-hidden rounded-[32px] bg-ink text-white md:min-h-[480px]">
        {images.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0 rounded-[32px] bg-cover bg-center transition-opacity duration-1000"
            style={{ backgroundImage: `url(${src})`, opacity: images.length === 1 || i === idx % images.length ? 1 : 0 }}
            aria-hidden="true"
          />
        ))}
        <div
          className={`absolute inset-0 ${strongScrim ? "bg-gradient-to-t from-black/95 via-black/80 to-black/60" : "bg-gradient-to-t from-black/90 via-black/55 to-black/30"}`}
          aria-hidden="true"
        />
        <div
          className="absolute -right-24 -top-24 h-[360px] w-[360px] rounded-[var(--radius-btn,999px)]"
          style={{ background: "radial-gradient(circle, rgba(0,102,204,0.30) 0%, rgba(0,102,204,0) 70%)" }}
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-col items-start gap-4 p-7 md:p-12">
          {logoUrl ? (
            <span className="flex items-center justify-center rounded-[18px] bg-white p-3 shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
              <img
                src={logoUrl}
                alt={logoAlt ?? ""}
                className="h-auto max-h-[46px] w-auto max-w-[190px] object-contain"
              />
            </span>
          ) : null}
          <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-white">{eyebrow}</span>
          <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-5xl">{title}</h1>
          {lede ? <div className="max-w-2xl text-[15px] leading-relaxed text-white/70">{lede}</div> : null}
          {facts?.length ? (
            <>
              {/* Mobile: stacked pills, 2-col grid (style A) */}
              <div className="grid grid-cols-2 gap-2.5 pt-1 md:hidden">
                {facts.map((f) => (
                  <span
                    key={f.label ?? f.value}
                    className="flex flex-col items-center rounded-[16px] border border-white/20 bg-white/[0.04] px-4 py-3 text-center"
                  >
                    <b className="text-[17px] font-bold">{f.value}</b>
                    {f.label ? <span className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-white/55">{f.label}</span> : null}
                  </span>
                ))}
              </div>
              {/* Desktop: compact chips (style C) */}
              <div className="hidden flex-wrap gap-2 pt-1 md:flex">
                {facts.map((f) => (
                  <span
                    key={f.label ?? f.value}
                    className="flex min-w-[110px] flex-1 flex-col items-center rounded-[12px] bg-white/[0.08] px-4 py-2.5 text-center"
                  >
                    <b className="text-[15px] font-bold">{f.value}</b>
                    {f.label ? <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-white/50">{f.label}</span> : null}
                  </span>
                ))}
              </div>
            </>
          ) : null}
          {ctas?.length ? (
            <div className="flex flex-wrap gap-3 pt-2">
              {ctas.map((c) => (
                <a
                  key={c.label}
                  href={c.href}
                  className={
                    c.variant === "primary"
                      ? "flex h-12 items-center rounded-[var(--radius-btn)] bg-primary px-7 text-[15px] font-bold text-white"
                      : "flex h-12 items-center rounded-[var(--radius-btn)] border border-white/60 bg-white/10 px-7 text-[15px] font-bold text-white backdrop-blur-sm"
                  }
                >
                  {c.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </header>
      {crumbs.length ? (
        <nav className="flex flex-wrap items-center gap-x-1.5 gap-y-1 px-1 pt-4 text-[13px] text-muted" aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <span key={`${c.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 ? <span className="text-muted/50">›</span> : null}
              {c.href ? (
                <Link href={c.href} prefetch={false} className="font-medium hover:text-ink hover:underline">
                  {c.label}
                </Link>
              ) : (
                <span className="font-semibold text-ink">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
