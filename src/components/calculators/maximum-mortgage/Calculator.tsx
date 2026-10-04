"use client";
/**
 * Maximum Mortgage Calculator — max qualifying mortgage from income/debts.
 * Slug: maximum-mortgage-calculator
 */
import { useCallback, useMemo, useState } from "react";
import type { CalculatorSettings } from "@/lib/calculators/types";
import { fmtCAD, fmtCADmo, monthlyPI, qualifyingRate, todayISO } from "@/lib/calculators/math";
import { Field, Slider, Segmented, Card, ResultHero, MetricRow } from "../ui";
import { ReportButtons } from "../ReportButtons";
import { buildMaximumMortgagePdf, type MaximumMortgageReportState } from "./pdf";

const TERM_OPTIONS = [
  { value: "0.5", label: "6 Mo" },
  { value: "1", label: "1 Yr" },
  { value: "2", label: "2 Yr" },
  { value: "3", label: "3 Yr" },
  { value: "5", label: "5 Yr" },
  { value: "7", label: "7 Yr" },
  { value: "10", label: "10 Yr" },
];

export function MaximumMortgageCalculator({ settings }: { settings: CalculatorSettings }) {
  const [income, setIncome] = useState(120000);
  const [debts, setDebts] = useState(500);
  const [tax, setTax] = useState(333);
  const [heat, setHeat] = useState(120);
  const [condo, setCondo] = useState(0);
  const [rate, setRate] = useState(4.84);
  const [term, setTerm] = useState(5);
  const [amort, setAmort] = useState(30);

  const state: MaximumMortgageReportState = useMemo(() => {
    const mi = income / 12;
    const hc = condo * 0.5;
    const qr = qualifyingRate(rate, settings);
    let maxH = Math.min((mi * settings.gdsLimit) / 100, (mi * settings.tdsLimit) / 100 - debts);
    if (maxH < 0) maxH = 0;
    let maxPI = maxH - tax - heat - hc;
    if (maxPI < 0) maxPI = 0;
    const r = qr / 100 / 12;
    const n = amort * 12;
    let mm = 0;
    if (r > 0 && maxPI > 0) {
      const c = Math.pow(1 + r, n);
      mm = (maxPI * (c - 1)) / (r * c);
    }
    const piActual = monthlyPI(mm, rate, amort);
    return {
      income, debts, tax, heat, condo, rate, term, amort,
      maxMortgage: mm,
      piActual,
      gds: mi > 0 ? ((piActual + tax + heat + hc) / mi) * 100 : 0,
      tds: mi > 0 ? ((piActual + tax + heat + hc + debts) / mi) * 100 : 0,
      qualifyingRate: qr,
    };
  }, [income, debts, tax, heat, condo, rate, term, amort, settings]);

  const buildPdf = useCallback(
    () => buildMaximumMortgagePdf({ state, settings, reportDate: todayISO() }),
    [state, settings],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <div>
        <Card title="Income & Expenses">
          <div className="space-y-5">
            <Field label={`Annual Household Income — ${fmtCAD(income)}`}>
              <Slider value={income} onChange={setIncome} min={30000} max={500000} step={5000} />
            </Field>
            <Field label={`Monthly Debts — ${fmtCADmo(debts)}`}>
              <Slider value={debts} onChange={setDebts} min={0} max={5000} step={50} />
            </Field>
            <Field label={`Monthly Property Tax — ${fmtCADmo(tax)}`}>
              <Slider value={tax} onChange={setTax} min={0} max={2000} step={25} />
            </Field>
            <Field label={`Monthly Heating — ${fmtCADmo(heat)}`}>
              <Slider value={heat} onChange={setHeat} min={50} max={500} step={10} />
            </Field>
            <Field label={`Monthly Condo Fees — ${fmtCADmo(condo)}`}>
              <Slider value={condo} onChange={setCondo} min={0} max={1500} step={25} />
            </Field>
            <Field label={`Interest Rate — ${rate.toFixed(2)}%`}>
              <Slider value={rate} onChange={setRate} min={1} max={12} step={0.05} />
            </Field>
            <Field label="Mortgage Term" hint="Rate lock period before renewal">
              <Segmented
                value={String(term)}
                onChange={(v) => setTerm(parseFloat(v))}
                options={TERM_OPTIONS}
              />
            </Field>
            <Field label={`Amortization — ${amort} years`}>
              <Slider value={amort} onChange={setAmort} min={5} max={35} step={1} />
            </Field>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <ResultHero
          label="Maximum Mortgage Amount"
          value={fmtCAD(state.maxMortgage)}
          sub={`Monthly P&I at ${rate.toFixed(2)}%: ${fmtCADmo(state.piActual)}`}
        />

        <Card title="Qualification">
          <MetricRow
            label={`GDS Ratio (max ${settings.gdsLimit}%)`}
            value={`${state.gds.toFixed(1)}%`}
            tone={state.gds <= settings.gdsLimit ? "good" : "bad"}
          />
          <MetricRow
            label={`TDS Ratio (max ${settings.tdsLimit}%)`}
            value={`${state.tds.toFixed(1)}%`}
            tone={state.tds <= settings.tdsLimit ? "good" : "bad"}
          />
          <MetricRow label="Qualifying Rate" value={`${state.qualifyingRate.toFixed(2)}%`} strong />
        </Card>

        <ReportButtons slug="maximum-mortgage-calculator" title="Maximum Mortgage Calculator" buildPdf={buildPdf} />
      </div>
    </div>
  );
}
