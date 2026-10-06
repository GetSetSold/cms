"use client";
/**
 * Compare Mortgage Scenarios — up to 3 lenders side by side.
 * Slug: compare-mortgage-rates
 */
import { useCallback, useMemo, useState } from "react";
import type { CalculatorSettings, RateType } from "@/lib/calculators/types";
import {
  fmtCAD,
  fmtCADmo,
  monthlyPI,
  nominalTermSummary,
  cmhcPremium,
  termLabel,
  todayISO,
} from "@/lib/calculators/math";
import {
  Field,
  Slider,
  Select,
  Segmented,
  Card,
  MetricRow,
} from "../ui";
import { ReportButtons } from "../ReportButtons";
import {
  buildCompareMortgagePdf,
  type CompareMortgageReportState,
  type CompareScenarioState,
} from "./pdf";

const TERM_OPTIONS = [
  { value: "0.5", label: "6 Mo" },
  { value: "1", label: "1 Yr" },
  { value: "2", label: "2 Yr" },
  { value: "3", label: "3 Yr" },
  { value: "5", label: "5 Yr" },
  { value: "7", label: "7 Yr" },
  { value: "10", label: "10 Yr" },
];

interface ScenarioInput {
  name: string;
  rateType: RateType;
  rate: number;
  term: number;
  amort: number;
}

const DEFAULT_SCENARIOS: ScenarioInput[] = [
  { name: "Lender A", rateType: "fixed", rate: 4.49, term: 5, amort: 30 },
  { name: "Lender B", rateType: "fixed", rate: 4.84, term: 5, amort: 30 },
  { name: "Lender C", rateType: "fixed", rate: 5.29, term: 5, amort: 30 },
];

function ScenarioCard({
  idx,
  input,
  result,
  isBest,
  onChange,
}: {
  idx: number;
  input: ScenarioInput;
  result: CompareScenarioState;
  isBest: boolean;
  onChange: (s: ScenarioInput) => void;
}) {
  const set = (patch: Partial<ScenarioInput>) => onChange({ ...input, ...patch });
  return (
    <div
      className={`relative rounded-[var(--radius-md)] border bg-white p-5 shadow-[var(--shadow)] ${
        isBest ? "border-primary ring-2 ring-primary/20" : "border-line"
      }`}
    >
      {isBest && (
        <span className="absolute -top-3 left-4 rounded-[var(--radius-label)] bg-primary px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
          Lowest Payment
        </span>
      )}
      <h3 className="mb-4 text-[15px] font-bold text-ink">Scenario {String.fromCharCode(65 + idx)}</h3>
      <div className="space-y-4">
        <Field label="Lender name">
          <input
            type="text"
            value={input.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="e.g. RBC, TD, Scotiabank…"
            className="w-full rounded-[var(--radius-sm)] border border-line bg-white px-3 py-2.5 text-[15px] font-medium text-ink outline-none transition focus:border-accent"
          />
        </Field>
        <Field label="Rate Type">
          <Segmented<RateType>
            value={input.rateType}
            onChange={(v) => set({ rateType: v })}
            options={[
              { value: "fixed", label: "Fixed" },
              { value: "variable", label: "Variable" },
            ]}
          />
        </Field>
        <Field label={`Rate — ${input.rate.toFixed(2)}%`}>
          <Slider value={input.rate} onChange={(v) => set({ rate: v })} min={1} max={12} step={0.05} />
        </Field>
        <Field label="Term">
          <Select
            value={String(input.term)}
            onChange={(v) => set({ term: parseFloat(v) })}
            options={TERM_OPTIONS}
          />
        </Field>
        <Field label={`Amortization — ${input.amort} years`}>
          <Slider value={input.amort} onChange={(v) => set({ amort: v })} min={5} max={35} step={1} />
        </Field>
        <div className="border-t border-line pt-3">
          <MetricRow label="Monthly P&I" value={fmtCADmo(result.pi)} strong />
          <MetricRow label={`Interest Over ${termLabel(input.term)}`} value={fmtCAD(result.intTerm)} />
          <MetricRow label="Balance at Renewal" value={fmtCAD(result.balance)} />
          <MetricRow label="Total Interest" value={fmtCAD(result.intFull)} />
          <MetricRow label="Total Cost" value={fmtCAD(result.totalCost)} strong />
        </div>
      </div>
    </div>
  );
}

export function CompareMortgageCalculator({ settings }: { settings: CalculatorSettings }) {
  const [price, setPrice] = useState(600000);
  const [down, setDown] = useState(120000);
  const [scenarios, setScenarios] = useState<ScenarioInput[]>(DEFAULT_SCENARIOS);

  const state: CompareMortgageReportState = useMemo(() => {
    const loan = price - down;
    const cm = cmhcPremium(loan, price, settings);
    const tm = loan + cm;
    const results: CompareScenarioState[] = scenarios.map((s) => {
      const pi = monthlyPI(tm, s.rate, s.amort);
      const ti = nominalTermSummary(tm, s.rate, s.amort, s.term);
      const intFull = pi * s.amort * 12 - tm;
      return {
        ...s,
        pi,
        intTerm: ti.intPaid,
        balance: ti.balance,
        intFull,
        totalCost: intFull + loan + down,
      };
    });
    let bestIdx = 0;
    results.forEach((r, i) => {
      if (i === 0 || r.pi < results[bestIdx].pi) bestIdx = i;
    });
    return { price, down, scenarios: results, bestIdx };
  }, [price, down, scenarios, settings]);

  const buildPdf = useCallback(
    () => buildCompareMortgagePdf({ state, settings, reportDate: todayISO() }),
    [state, settings],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <div>
        <Card title="Common Settings">
          <div className="space-y-5">
            <Field label={`Property Price — ${fmtCAD(price)}`}>
              <Slider value={price} onChange={setPrice} min={100000} max={3000000} step={10000} />
            </Field>
            <Field label={`Down Payment — ${fmtCAD(down)}`}>
              <Slider value={down} onChange={setDown} min={0} max={1500000} step={5000} />
            </Field>
          </div>
        </Card>
      </div>
      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-3 md:grid-cols-2">
          {scenarios.map((s, i) => (
            <ScenarioCard
              key={i}
              idx={i}
              input={s}
              result={state.scenarios[i]}
              isBest={i === state.bestIdx}
              onChange={(ns) =>
                setScenarios((prev) => prev.map((p, j) => (j === i ? ns : p)))
              }
            />
          ))}
        </div>
        <ReportButtons slug="compare-mortgage-rates" title="Compare Mortgage Scenarios" buildPdf={buildPdf} />
      </div>
    </div>
  );
}
