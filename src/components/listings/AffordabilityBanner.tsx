"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import type { CalculatorSettings } from "@/lib/calculators/types";

const AffordabilityCalculator = dynamic(
  () => import("@/components/calculators/affordability/Calculator").then((m) => ({ default: m.AffordabilityCalculator })),
  { ssr: false, loading: () => <p className="text-sm text-muted">Loading calculator…</p> }
);

/** Small banner under the agent card (For Sale only). Opens affordability calculator in a modal. */
export function AffordabilityBanner({ settings }: { settings: CalculatorSettings }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="card group flex w-full items-center gap-3 p-4 text-left transition-shadow hover:shadow-md"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-white">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <line x1="8" y1="6" x2="16" y2="6" />
            <line x1="8" y1="11" x2="8" y2="11.01" />
            <line x1="12" y1="11" x2="12" y2="11.01" />
            <line x1="16" y1="11" x2="16" y2="11.01" />
            <line x1="8" y1="15" x2="8" y2="15.01" />
            <line x1="12" y1="15" x2="12" y2="15.01" />
            <line x1="16" y1="15" x2="16" y2="15.01" />
            <line x1="8" y1="19" x2="8" y2="19.01" />
            <line x1="12" y1="19" x2="12" y2="19.01" />
            <line x1="16" y1="19" x2="16" y2="19.01" />
          </svg>
        </span>
        <span className="min-w-0">
          <span className="block text-[14px] font-semibold leading-tight">Can you afford this home?</span>
          <span className="block text-[12px] text-muted leading-tight">Free affordability calculator</span>
        </span>
        <span className="ml-auto shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true">→</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Affordability calculator">
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/55" />
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h3 className="font-display text-xl">Affordability Calculator</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close dialog" className="rounded-full p-1.5 hover:bg-gray-100 text-xl leading-none">
                ×
              </button>
            </div>
            <AffordabilityCalculator settings={settings} />
          </div>
        </div>
      ) : null}
    </>
  );
}
