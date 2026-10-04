"use client";
/**
 * Net Proceeds Calculator.
 * Estimates what a seller keeps after commission, HST, mortgage payout,
 * penalties and customizable ancillary selling costs.
 */
import { useMemo, useState } from "react";
import { fmtCAD, todayISO } from "@/lib/calculators/math";
import type { CalculatorSettings } from "@/lib/calculators/types";
import { Card, CurrencyInput, Field, MetricRow, NumberInput, ResultHero } from "../ui";
import { ReportButtons } from "../ReportButtons";
import {
  DEFAULT_ANCILLARY_ITEMS,
  buildNetProceedsPdf,
  computeNetProceeds,
  type AncillaryItem,
} from "./pdf";

function MiniSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="shrink-0"
    >
      <span className={`relative block h-6 w-11 rounded-full transition ${checked ? "bg-accent" : "bg-neutral-300"}`}>
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}

export function NetProceedsCalculator({ settings }: { settings: CalculatorSettings }) {
  void settings;
  const [salePrice, setSalePrice] = useState(800000);
  const [mortgage, setMortgage] = useState(400000);
  const [penalty, setPenalty] = useState(0);
  const [commRate, setCommRate] = useState(5);
  const [items, setItems] = useState<AncillaryItem[]>(DEFAULT_ANCILLARY_ITEMS);
  const [addName, setAddName] = useState("");
  const [addAmt, setAddAmt] = useState(0);
  const [addError, setAddError] = useState(false);

  const s = useMemo(
    () => computeNetProceeds({ salePrice, mortgage, penalty, commRate, items }),
    [salePrice, mortgage, penalty, commRate, items],
  );

  const toggleItem = (id: string) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, on: !it.on } : it)));
  const updateAmt = (id: string, v: number) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, amount: Math.max(0, v) } : it)));
  const removeItem = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id));
  const addItem = () => {
    if (!addName.trim()) {
      setAddError(true);
      setTimeout(() => setAddError(false), 1500);
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        id: `np_custom_${Date.now()}`,
        name: addName.trim(),
        desc: "Custom selling cost added by user.",
        amount: Math.max(0, addAmt),
        on: true,
        removable: true,
      },
    ]);
    setAddName("");
    setAddAmt(0);
  };

  const activeItems = items.filter((it) => it.on && it.amount > 0);
  const barPct = Math.max(0, Math.min(100, s.pct));
  const barTone = s.pct >= 60 ? "bg-emerald-500" : s.pct >= 30 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className="space-y-6">
          <Card title="Sale Details">
            <div className="space-y-4">
              <Field label="Sale Price">
                <CurrencyInput value={salePrice} onChange={setSalePrice} />
              </Field>
              <Field
                label="Outstanding Mortgage Balance"
                hint="The remaining amount owed on your mortgage at the time of sale"
              >
                <CurrencyInput value={mortgage} onChange={setMortgage} />
              </Field>
              <Field
                label="Mortgage Penalty"
                hint="Interest rate differential (IRD) or 3-month interest penalty for breaking your mortgage early"
              >
                <CurrencyInput value={penalty} onChange={setPenalty} />
              </Field>
            </div>
          </Card>

          <Card title="Realtor Commission">
            <div className="space-y-4">
              <Field
                label="Commission Rate"
                hint="Typical commission in Ontario is 5% (split between listing and buyer agents). Adjust to your agreed rate."
              >
                <div className="flex items-center gap-3">
                  <div className="w-32">
                    <NumberInput value={commRate} onChange={setCommRate} suffix="%" />
                  </div>
                  <span className="text-[15px] font-bold tabular-nums text-ink">{fmtCAD(s.commission)}</span>
                </div>
              </Field>
              <MetricRow label="HST on Commission (13%)" value={fmtCAD(s.hstOnComm)} />
              <p className="text-[12px] text-muted">13% HST is charged on realtor commission in Ontario. Auto-calculated.</p>
            </div>
          </Card>

          <Card title="Additional Selling Costs">
            <p className="mb-4 text-[12px] leading-5 text-muted">
              Common costs when selling a property. Toggle items on/off and edit amounts to customize your estimate.
            </p>
            <div className="space-y-3">
              {items.map((it) => (
                <div key={it.id} className="rounded-[var(--radius-sm)] border border-line p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold text-ink">{it.name}</div>
                      <div className="mt-0.5 text-[12px] leading-5 text-muted">{it.desc}</div>
                    </div>
                    <MiniSwitch checked={it.on} onChange={() => toggleItem(it.id)} label={it.name} />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="w-36">
                      <NumberInput value={it.amount} onChange={(v) => updateAmt(it.id, v)} />
                    </div>
                    {it.removable && (
                      <button
                        type="button"
                        onClick={() => removeItem(it.id)}
                        aria-label={`Remove ${it.name}`}
                        className="rounded-[var(--radius-sm)] border border-line px-2.5 py-2 text-[13px] font-semibold text-muted hover:text-red-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Add custom cost (e.g. Cleaning, Repairs...)"
                className={`flex-1 rounded-[var(--radius-sm)] border bg-white px-3 py-2.5 text-[14px] outline-none focus:border-accent ${addError ? "border-red-500" : "border-line"}`}
              />
              <div className="w-28">
                <NumberInput value={addAmt} onChange={setAddAmt} />
              </div>
              <button
                type="button"
                onClick={addItem}
                className="rounded-[var(--radius-sm)] bg-primary px-4 py-2.5 text-[14px] font-semibold text-white hover:opacity-90"
              >
                + Add
              </button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <ResultHero
            label="Estimated Net Proceeds"
            value={fmtCAD(s.netProceeds)}
            sub={
              s.netProceeds < 0
                ? `Warning: Deductions exceed sale price by ${fmtCAD(Math.abs(s.netProceeds))}`
                : `You keep ${s.pct.toFixed(1)}% of the sale price`
            }
          />

          <div className="rounded-[var(--radius-md)] border border-line bg-white p-5 shadow-[var(--shadow)]">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-ink">Proceeds as % of Sale Price</span>
              <span className="text-[13px] font-bold tabular-nums text-ink">{s.pct.toFixed(1)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-soft">
              <div className={`h-full rounded-full ${barTone} transition-all`} style={{ width: `${barPct}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Sale Price", value: fmtCAD(s.salePrice) },
              { label: "Total Deductions", value: fmtCAD(s.totalDeductions), tone: "bad" as const },
              { label: "Net to You", value: fmtCAD(s.netProceeds) },
            ].map((m) => (
              <div key={m.label} className="rounded-[var(--radius-sm)] border border-line bg-white px-3 py-3 shadow-[var(--shadow)]">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{m.label}</div>
                <div className={`mt-1 text-[16px] font-bold tabular-nums ${m.tone === "bad" ? "text-red-600" : "text-ink"}`}>
                  {m.value}
                </div>
              </div>
            ))}
          </div>

          <Card title="Cost Breakdown">
            <MetricRow label="Sale Price" value={`+${fmtCAD(s.salePrice)}`} strong tone="good" />
            <MetricRow label="Outstanding Mortgage" value={`−${fmtCAD(s.mortgage)}`} />
            <MetricRow label="Mortgage Penalty" value={s.penalty > 0 ? `−${fmtCAD(s.penalty)}` : "—"} tone="muted" />
            <MetricRow label={`Realtor Commission (${s.commRate}%)`} value={`−${fmtCAD(s.commission)}`} />
            <MetricRow label="HST on Commission (13%)" value={`−${fmtCAD(s.hstOnComm)}`} />
            {activeItems.map((it) => (
              <MetricRow key={it.id} label={it.name} value={`−${fmtCAD(it.amount)}`} />
            ))}
            <div className="mt-2 border-t-2 border-primary pt-2">
              <MetricRow
                label="Net Proceeds"
                value={fmtCAD(s.netProceeds)}
                strong
                tone={s.netProceeds >= 0 ? undefined : "bad"}
              />
            </div>
          </Card>
        </div>
      </div>

      <ReportButtons
        slug="net-proceeds-calculator"
        title="Net Proceeds Report"
        buildPdf={() => buildNetProceedsPdf({ state: s, settings, reportDate: todayISO() })}
      />
    </div>
  );
}
