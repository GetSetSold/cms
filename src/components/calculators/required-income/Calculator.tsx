"use client";
/**
 * Required Income Calculator — minimum household income to qualify.
 * Slug: required-income-calculator
 */
import { useCallback, useMemo, useState } from "react";
import type { CalculatorSettings } from "@/lib/calculators/types";
import {
  fmtCAD,
  fmtCADmo,
  monthlyPI,
  cmhcPremium,
  qualifyingRate,
  todayISO,
} from "@/lib/calculators/math";
import { Field, CurrencyInput, Slider, Segmented, Card, ResultHero, MetricRow } from "../ui";
import { ReportButtons } from "../ReportButtons";
import { buildRequiredIncomePdf, type RequiredIncomeReportState } from "./pdf";

const TERM_OPTIONS = [
  { value: "0.5", label: "6 Mo" },
  { value: "1", label: "1 Yr" },
  { value: "2", label: "2 Yr" },
  { value: "3", label: "3 Yr" },
  { value: "5", label: "5 Yr" },
  { value: "7", label: "7 Yr" },
  { value: "10", label: "10 Yr" },
];

export function RequiredIncomeCalculator({ settings }: { settings: CalculatorSettings }) {
  const [price, setPrice] = useState(600000);
  const [down, setDown] = useState(30000);
  const [rate, setRate] = useState(4.84);
  const [term, setTerm] = useState(5);
  const [amort, setAmort] = useState(30);
  const [tax, setTax] = useState(350);
  const [heat, setHeat] = useState(120);
  const [condo, setCondo] = useState(0);
  const [debts, setDebts] = useState(500);

  const state: RequiredIncomeReportState = useMemo(() => {
    const loan = price - down;
    const cmhc = cmhcPremium(loan, price, settings);
    const mortgage = loan + cmhc;
    const hc = condo * 0.5;
    const qr = qualifyingRate(rate, settings);
    // At the qualifying rate, find income where GDS hits the limit and TDS hits the limit
    const piQ = monthlyPI(mortgage, qr, amort);
    const housing = piQ + tax + heat + hc;
    const incGDS = (housing / (settings.gdsLimit / 100)) * 12;
    const incTDS = ((housing + debts) / (settings.tdsLimit / 100)) * 12;
    return {
      price, down, rate, term, amort, tax, heat, condo, debts,
      mortgage,
      piQualifying: piQ,
      housing,
      reqIncome: Math.max(incGDS, incTDS),
      qualifyingRate: qr,
    };
  }, [price, down, rate, term, amort, tax, heat, condo, debts, settings]);

  const buildPdf = useCallback(
    () => buildRequiredIncomePdf({ state, settings, reportDate: todayISO() }),
    [state, settings],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <div>
        <Card title="Target Property">
          <div className="space-y-5">
            <Field label={`Property Price — ${fmtCAD(price)}`}>
              <Slider value={price} onChange={setPrice} min={100000} max={3000000} step={10000} />
            </Field>
            <Field label={`Down Payment — ${fmtCAD(down)}`}>
              <Slider value={down} onChange={setDown} min={0} max={1500000} step={5000} />
            </Field>
            <Field label={`Mortgage Rate — ${rate.toFixed(2)}%`}>
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
            <Field label="Monthly Property Tax">
              <CurrencyInput value={tax} onChange={setTax} />
            </Field>
            <Field label="Monthly Heating">
              <CurrencyInput value={heat} onChange={setHeat} />
            </Field>
            <Field label="Monthly Condo Fees">
              <CurrencyInput value={condo} onChange={setCondo} />
            </Field>
            <Field label="Other Monthly Debts">
              <CurrencyInput value={debts} onChange={setDebts} />
            </Field>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <ResultHero
          label="Minimum Required Income"
          value={fmtCAD(state.reqIncome)}
          sub={`or ${fmtCADmo(state.reqIncome / 12)}`}
        />

        <Card title="Qualification Details">
          <MetricRow label="Mortgage Amount" value={fmtCAD(state.mortgage)} strong />
          <MetricRow label="Monthly P&I (qualifying)" value={fmtCADmo(state.piQualifying)} />
          <MetricRow label="Monthly Housing Cost" value={fmtCADmo(state.housing)} />
          <MetricRow label="Qualifying Rate" value={`${state.qualifyingRate.toFixed(2)}%`} />
        </Card>

        <ReportButtons slug="required-income-calculator" title="Required Income Calculator" buildPdf={buildPdf} />
      </div>
    </div>
  );
}
