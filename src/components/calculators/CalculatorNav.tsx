"use client";
/**
 * Prev/next + "all calculators" navigation shown at the bottom of each
 * calculator detail page.
 */
import Link from "next/link";
import { CALCULATORS } from "@/lib/calculators/registry";

export function CalculatorNav({ currentSlug }: { currentSlug: string }) {
  const idx = CALCULATORS.findIndex((c) => c.slug === currentSlug);
  const prev = idx > 0 ? CALCULATORS[idx - 1] : null;
  const next = idx >= 0 && idx < CALCULATORS.length - 1 ? CALCULATORS[idx + 1] : null;

  return (
    <nav className="mt-10 rounded-[var(--radius-md)] border border-line bg-white p-5 shadow-[var(--shadow)]" aria-label="More calculators">
      <div className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-accent">Keep exploring</div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          {prev ? (
            <Link href={`/calculators/${prev.slug}`} className="group inline-flex items-center gap-2 text-[14px] font-semibold text-ink hover:text-accent">
              <span aria-hidden>←</span> {prev.title}
            </Link>
          ) : <span />}
        </div>
        <Link href="/calculators" className="rounded-[var(--radius-sm)] border border-line px-4 py-2 text-[13.5px] font-semibold text-ink transition hover:border-accent hover:text-accent">
          All 14 calculators
        </Link>
        <div className="flex-1 text-right">
          {next && (
            <Link href={`/calculators/${next.slug}`} className="group inline-flex items-center gap-2 text-[14px] font-semibold text-ink hover:text-accent">
              {next.title} <span aria-hidden>→</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
