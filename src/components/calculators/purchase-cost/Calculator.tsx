"use client";
/**
 * Purchase Cost Calculator — total monthly housing cost with GDS/TDS validation.
 * Slug: purchase-cost-calculator
 */
import { useCallback, useMemo, useState } from "react";
import type { CalculatorSettings, RateType } from "@/lib/calculators/types";
import {
  fmtCAD,
  fmtCADmo,
  monthlyPI,
  cmhcPremium,
  minDownPayment,
  todayISO,
} from "@/lib/calculators/math";
import {
  Field,
  CurrencyInput,
  Slider,
  Segmented,
  Card,
  ResultHero,
  MetricRow,
  PassFail,
} from "../ui";
import { ReportButtons } from "../ReportButtons";
import { buildPurchaseCostPdf, type PurchaseCostReportState } from "./pdf";

const TERM_OPTIONS = [
  { value: "0.5", label: "6 Mo" },
  { value: "1", label: "1 Yr" },
  { value: "2", label: "2 Yr" },
  { value: "3", label: "3 Yr" },
  { value: "5", label: "5 Yr" },
  { value: "7", label: "7 Yr" },
  { value: "10", label: "10 Yr" },
];

export function PurchaseCostCalculator({ settings }: { settings: CalculatorSettings }) {
  const [price, setPrice] = useState(600000);
  const [down, setDown] = useState(30000);
  const [rateType, setRateType] = useState<RateType>("fixed");
  const [rate, setRate] = useState(4.84);
  const [term, setTerm] = useState(5);
  const [amort, setAmort] = useState(30);
  const [tax, setTax] = useState(350);
  const [heat, setHeat] = useState(120);
  const [condo, setCondo] = useState(0);
  const [debts, setDebts] = useState(500);
  const [income, setIncome] = useState(120000);

  const state: PurchaseCostReportState = useMemo(() => {
    const loan = price - down;
    const cmhc = cmhcPremium(loan, price, settings);
    const mortgage = loan + cmhc;
    const pi = monthlyPI(mortgage, rate, amort);
    const condoHalf = condo * 0.5;
    const totalMo = pi + tax + heat + condoHalf;
    const mi = income / 12;
    const housing = pi + tax + heat + condoHalf;
    const gds = mi > 0 ? (housing / mi) * 100 : 999;
    const tds = mi > 0 ? ((housing + debts) / mi) * 100 : 999;
    return {
      price, down, rateType, rate, term, amort, tax, heat, condo, debts, income,
      loan, cmhc, mortgage, pi, condoHalf, totalMo,
      downPct: price > 0 ? (down / price) * 100 : 0,
      minDown: minDownPayment(price, settings),
      gds, tds,
      gdsOk: gds <= settings.gdsLimit,
      tdsOk: tds <= settings.tdsLimit,
    };
  }, [price, down, rateType, rate, term, amort, tax, heat, condo, debts, income, settings]);

  const buildPdf = useCallback(
    () => buildPurchaseCostPdf({ state, settings, reportDate: todayISO() }),
    [state, settings],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <div>
        <Card title="Purchase Details">
          <div className="space-y-5">
            <Field label={`Purchase Price — ${fmtCAD(price)}`}>
              <Slider value={price} onChange={setPrice} min={100000} max={3000000} step={10000} />
            </Field>
            <Field label={`Down Payment — ${fmtCAD(down)}`} hint={`Min down: ${fmtCAD(state.minDown)}`}>
              <Slider value={down} onChange={setDown} min={5000} max={1500000} step={5000} />
            </Field>
            <Field label="Rate Type">
              <Segmented<RateType>
                value={rateType}
                onChange={setRateType}
                options={[
                  { value: "fixed", label: "Fixed" },
                  { value: "variable", label: "Variable" },
                ]}
              />
            </Field>
            <Field label={`${rateType === "fixed" ? "Fixed" : "Variable"} Rate — ${rate.toFixed(2)}%`}>
              <Slider value={rate} onChange={setRate} min={1} max={12} step={0.05} />
            </Field>
            <Field label="Mortgage Term" hint="Term is your rate lock period; amortization is total payoff time">
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
            <Field label="Monthly Debts">
              <CurrencyInput value={debts} onChange={setDebts} />
            </Field>
            <Field label="Annual Household Income">
              <CurrencyInput value={income} onChange={setIncome} />
            </Field>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <ResultHero
          label="Total Monthly Cost"
          value={fmtCADmo(state.totalMo)}
          sub={`Mortgage P&I: ${fmtCADmo(state.pi)}`}
        />

        <Card title="Cost Breakdown">
          <MetricRow label="Down Payment %" value={`${state.downPct.toFixed(1)}%`} />
          <MetricRow
            label="CMHC Insurance"
            value={state.cmhc > 0 ? fmtCAD(state.cmhc) : "Waived"}
            tone={state.cmhc > 0 ? "muted" : "good"}
          />
          <MetricRow label="Mortgage Amount" value={fmtCAD(state.mortgage)} strong />
          <MetricRow label="Min Down Payment" value={fmtCAD(state.minDown)} />
        </Card>

        <Card title="Monthly Breakdown">
          <MetricRow label="Mortgage P&I" value={fmtCADmo(state.pi)} />
          <MetricRow label="Property Tax" value={fmtCADmo(state.tax)} />
          <MetricRow label="Heating" value={fmtCADmo(state.heat)} />
          {state.condo > 0 && <MetricRow label="Condo Fees (50%)" value={fmtCADmo(state.condoHalf)} />}
          <MetricRow label="Total Monthly" value={fmtCADmo(state.totalMo)} strong />
        </Card>

        <Card title="Qualification Check">
          <div className="flex items-center justify-between gap-4 border-b border-line py-2.5">
            <span className="text-[13.5px] text-muted">
              GDS Ratio — <strong className="text-ink">{state.gds.toFixed(1)}%</strong> / {settings.gdsLimit}%
            </span>
            <PassFail pass={state.gdsOk} label={`${state.gds.toFixed(1)}%`} />
          </div>
          <div className="flex items-center justify-between gap-4 py-2.5">
            <span className="text-[13.5px] text-muted">
              TDS Ratio — <strong className="text-ink">{state.tds.toFixed(1)}%</strong> / {settings.tdsLimit}%
            </span>
            <PassFail pass={state.tdsOk} label={`${state.tds.toFixed(1)}%`} />
          </div>
        </Card>

        <ReportButtons slug="purchase-cost-calculator" title="Purchase Cost Calculator" buildPdf={buildPdf} />
      </div>
    </div>
  );
}
