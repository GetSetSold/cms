"use client";
/**
 * Shared calculator form controls + result primitives.
 * All controls read Settings Shape tokens (radius/shadow) — no hardcoded radii.
 */
import React from "react";

const inputCls =
  "w-full rounded-[var(--radius-sm)] border border-line bg-white px-3 py-2.5 text-[15px] font-medium text-ink shadow-[var(--shadow)] outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] leading-5 text-muted">{hint}</span>}
    </label>
  );
}

export function CurrencyInput({
  value, onChange, prefix = "$",
}: {
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] font-medium text-muted">{prefix}</span>
      <input
        type="text"
        inputMode="numeric"
        className={`${inputCls} pl-7`}
        value={value === 0 ? "" : value.toLocaleString("en-CA")}
        placeholder="0"
        onChange={(e) => {
          const n = parseFloat(e.target.value.replace(/[^0-9.]/g, ""));
          onChange(Number.isFinite(n) ? n : 0);
        }}
      />
    </div>
  );
}

export function NumberInput({
  value, onChange, suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        className={`${inputCls} ${suffix ? "pr-10" : ""}`}
        value={value === 0 ? "" : String(value)}
        placeholder="0"
        onChange={(e) => {
          const n = parseFloat(e.target.value.replace(/[^0-9.]/g, ""));
          onChange(Number.isFinite(n) ? n : 0);
        }}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-muted">{suffix}</span>
      )}
    </div>
  );
}

export function Select({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function Segmented<T extends string>({
  value, onChange, options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="grid rounded-[var(--radius-sm)] border border-line bg-soft p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-[var(--radius-sm)] px-2 py-2 text-[13px] font-semibold transition ${
            value === o.value ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({
  value, onChange, min, max, step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-[#0066CC]"
    />
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-line bg-white px-3 py-2.5 text-left"
    >
      <span className="text-[14px] font-medium text-ink">{label}</span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-[#0066CC]" : "bg-neutral-300"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

/** Big result card — the hero number of a calculator. */
export function ResultHero({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-white p-5 shadow-[var(--shadow)]">
      <div className="border-l-4 border-l-primary pl-3">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-muted">{label}</div>
        <div className="mt-1 text-[28px] font-bold tracking-tight text-ink">{value}</div>
        {sub && <div className="mt-1 text-[13px] text-muted">{sub}</div>}
      </div>
    </div>
  );
}

export function MetricRow({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "good" | "bad" | "muted" }) {
  const color = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-red-600" : tone === "muted" ? "text-muted" : "text-ink";
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <span className={`text-[13.5px] ${strong ? "font-semibold text-ink" : "text-muted"}`}>{label}</span>
      <span className={`text-[14px] tabular-nums ${strong ? "font-bold" : "font-semibold"} ${color}`}>{value}</span>
    </div>
  );
}

export function Card({ title, children, action }: { title?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-md)] border border-line bg-white p-5 shadow-[var(--shadow)]">
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-[16px] font-bold text-ink">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PassFail({ pass, label }: { pass: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${pass ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
      {pass ? "Pass" : "Fail"} · {label}
    </span>
  );
}

export function SimpleTable({ cols, rows }: { cols: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th key={c} className={`border-b-2 border-primary bg-blue-50/60 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-primary ${i === 0 ? "text-left" : "text-right"}`}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="hover:bg-soft">
              {r.map((cell, ci) => (
                <td key={ci} className={`border-b border-neutral-100 px-3 py-2.5 tabular-nums ${ci === 0 ? "text-left font-medium text-ink" : "text-right font-semibold text-ink"}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
