"use client";
/**
 * Buy vs Rent Calculator.
 * Compares total cost of buying vs renting over a horizon, with a
 * year-by-year break-even progression. Heavy yearly table lives in a
 * <details> block to protect DOM size.
 */
import { useMemo, useState } from "react";
import { fmtCAD, fmtCADmo, todayISO } from "@/lib/calculators/math";
import type { CalculatorSettings } from "@/lib/calculators/types";
import {
  Card,
  CurrencyInput,
  Field,
  MetricRow,
  NumberInput,
  ResultHero,
  SimpleTable,
  Slider,
} from "../ui";
import { ReportButtons } from "../ReportButtons";
import { buildBuyVsRentPdf, computeBuyVsRent } from "./pdf";

function signed(v: number): string {
  return v >= 0 ? fmtCAD(v) : "−" + fmtCAD(Math.abs(v));
}

function MetricBox({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-red-600" : "text-ink";
  return (
    <div className="rounded-[var(--radius-sm)] border border-line bg-white px-3 py-3 shadow-[var(--shadow)]">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 text-[16px] font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

export function BuyVsRentCalculator({ settings }: { settings: CalculatorSettings }) {
  const [price, setPrice] = useState(600000);
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(4.99);
  const [amort, setAmort] = useState(25);
  const [rent, setRent] = useState(2500);
  const [rentInc, setRentInc] = useState(2);
  const [propTax, setPropTax] = useState(3500);
  const [insurance, setInsurance] = useState(1200);
  const [maint, setMaint] = useState(3000);
  const [apprec, setApprec] = useState(3.5);
  const [investReturn, setInvestReturn] = useState(6);
  const [years, setYears] = useState(10);

  const s = useMemo(
    () =>
      computeBuyVsRent(
        { price, downPct, rate, amort, rent, rentInc, propTax, insurance, maint, apprec, investReturn, years },
        settings,
      ),
    [price, downPct, rate, amort, rent, rentInc, propTax, insurance, maint, apprec, investReturn, years, settings],
  );

  const tips = useMemo(() => {
    const t: string[] = [];
    if (s.buyingBetter) {
      t.push(
        `Buying Wins: After ${s.years} years, you come out ahead by ${fmtCAD(s.difference)}. Home appreciation of ${s.apprec.toFixed(1)}%/yr builds significant equity over time.`,
      );
    } else {
      t.push(
        `Renting Wins (so far): After ${s.years} years, renting saves you ${fmtCAD(s.difference)}. However, buying typically wins over longer periods due to equity accumulation.`,
      );
    }
    if (s.beYear) {
      t.push(
        `Break-Even in Year ${s.beYear}: This is when buying becomes more advantageous than renting given your assumptions. The longer you stay, the more equity you build.`,
      );
    } else {
      t.push(
        "No Break-Even Found: With current assumptions, renting remains better throughout the amortization period. Consider higher appreciation or a shorter comparison.",
      );
    }
    if (s.downPct < 20) {
      t.push(
        `CMHC Insurance: With ${s.downPct}% down, you pay ${fmtCAD(s.cmhc)} in mortgage insurance. Increasing to 20% eliminates this cost entirely.`,
      );
    }
    t.push(
      "Assumptions Matter: Small changes in appreciation rate or investment return can significantly shift the outcome. Consider a range of scenarios before deciding.",
    );
    return t;
  }, [s]);

  const pinPct = s.beYear ? Math.min(100, Math.max(2, (s.beYear / s.amort) * 100)) : 98;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className="space-y-6">
          <Card title="Property Details">
            <div className="space-y-4">
              <Field label="Home Price">
                <CurrencyInput value={price} onChange={setPrice} />
              </Field>
              <Field label={`Down Payment — ${fmtCAD(s.downAmt)} (${downPct}%)`}>
                <Slider value={downPct} onChange={setDownPct} min={5} max={50} step={1} />
              </Field>
              <Field label="Mortgage Rate">
                <NumberInput value={rate} onChange={setRate} suffix="%" />
              </Field>
              <Field label="Amortization">
                <NumberInput value={amort} onChange={setAmort} suffix="years" />
              </Field>
            </div>
          </Card>
          <Card title="Renting Details">
            <div className="space-y-4">
              <Field label="Monthly Rent">
                <CurrencyInput value={rent} onChange={setRent} />
              </Field>
              <Field label="Annual Rent Increase">
                <NumberInput value={rentInc} onChange={setRentInc} suffix="%" />
              </Field>
            </div>
          </Card>
          <Card title="Ownership Costs & Assumptions">
            <div className="space-y-4">
              <Field label="Property Tax / Year">
                <CurrencyInput value={propTax} onChange={setPropTax} />
              </Field>
              <Field label="Home Insurance / Year">
                <CurrencyInput value={insurance} onChange={setInsurance} />
              </Field>
              <Field label="Maintenance / Year">
                <CurrencyInput value={maint} onChange={setMaint} />
              </Field>
              <Field label="Home Appreciation / Year">
                <NumberInput value={apprec} onChange={setApprec} suffix="%" />
              </Field>
              <Field label="Investment Return (on savings)" hint="What the renter's saved down payment and monthly savings could earn">
                <NumberInput value={investReturn} onChange={setInvestReturn} suffix="%" />
              </Field>
              <Field label={`Comparison Period — ${years} years`}>
                <Slider value={years} onChange={setYears} min={1} max={30} step={1} />
              </Field>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <ResultHero
            label={`After ${s.years} Year${s.years > 1 ? "s" : ""}`}
            value={s.buyingBetter ? `Buying Saves You ${fmtCAD(s.difference)}` : `Renting Saves You ${fmtCAD(s.difference)}`}
            sub={
              s.buyingBetter
                ? `After ${s.years} years, buying is more affordable by ${fmtCAD(s.difference)}`
                : `After ${s.years} years, renting costs less by ${fmtCAD(s.difference)}`
            }
          />

          <Card title="Net Position">
            <MetricRow label="Buying Net Position" value={signed(s.netBuy)} strong tone={s.netBuy >= 0 ? "good" : "bad"} />
            <MetricRow label="Renting Net Position" value={signed(s.netRent)} strong tone={s.netRent >= 0 ? "good" : "bad"} />
            <MetricRow
              label="Difference"
              value={`${s.buyingBetter ? "+" : "−"}${fmtCAD(s.difference)}`}
              strong
              tone={s.buyingBetter ? "good" : "bad"}
            />
          </Card>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetricBox label="Break-Even Year" value={s.beYear ? `Year ${s.beYear}` : `> ${s.amort} yrs`} />
            <MetricBox label="Home Value" value={fmtCAD(s.homeValue)} />
            <MetricBox label="Equity Built" value={fmtCAD(s.equity)} />
            <MetricBox label="Total Rent Paid" value={fmtCAD(s.totalRent)} />
            <MetricBox label="Investment Value" value={fmtCAD(s.totalInvestValue)} />
            <MetricBox
              label="Monthly Difference"
              value={s.totalMonthly > s.rent ? `+${fmtCAD(s.totalMonthly - s.rent)}/mo` : `${fmtCAD(s.rent - s.totalMonthly)}/mo saved`}
            />
          </div>

          <div className="rounded-[var(--radius-md)] border border-line bg-white p-5 shadow-[var(--shadow)]">
            <div className="mb-2 text-[12px] font-bold text-ink">Break-Even Timeline</div>
            <div className="relative h-2 rounded-full bg-soft">
              <div
                className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
                style={{ left: `${pinPct}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] font-medium text-muted">
              <span>Year 1</span>
              <span>{s.beYear ? `Year ${s.amort}` : `Year ${s.amort}+`}</span>
            </div>
          </div>

          <Card title="Detailed Comparison">
            <SimpleTable
              cols={["Metric", "Buying", "Renting"]}
              rows={[
                ["Down Payment", fmtCAD(s.downAmt), "—"],
                ["CMHC Insurance", s.cmhc > 0 ? fmtCAD(s.cmhc) : "None", "—"],
                ["Monthly Mortgage", fmtCADmo(s.monthlyMortgage), "—"],
                ["Monthly Property Tax", fmtCADmo(s.propTax / 12), "—"],
                ["Monthly Insurance", fmtCADmo(s.insurance / 12), "—"],
                ["Monthly Maintenance", fmtCADmo(s.maint / 12), "—"],
                ["Total Monthly Cost", fmtCADmo(s.totalMonthly), fmtCADmo(s.currentRent)],
                [`Total Paid After ${s.years}yrs`, fmtCAD(s.totalPaidBuying), fmtCAD(s.totalRent)],
                ["Home / Invested Value", fmtCAD(s.homeValue), fmtCAD(s.totalInvestValue)],
                ["Equity / Net Invest", fmtCAD(s.equity), fmtCAD(s.totalInvestValue - s.totalRent)],
                ["Net Position", signed(s.netBuy), signed(s.netRent)],
              ]}
            />
          </Card>

          <Card title="Buy vs Rent Insights">
            <ul className="space-y-2.5">
              {tips.map((t, i) => (
                <li key={i} className="flex gap-2.5 text-[13.5px] leading-6 text-muted">
                  <span aria-hidden className="shrink-0">💡</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Card>

          <details className="rounded-[var(--radius-md)] border border-line bg-white p-5 shadow-[var(--shadow)]">
            <summary className="cursor-pointer text-[15px] font-bold text-ink">
              Year-by-Year Break-Even Progress
            </summary>
            <div className="mt-4">
              <SimpleTable
                cols={["Year", "Buying Net", "Renting Net", "Leader"]}
                rows={s.yearly.map((r) => [
                  `Yr ${r.year}`,
                  signed(r.netBuy),
                  signed(r.netRent),
                  r.netBuy >= r.netRent ? "Buying" : "Renting",
                ])}
              />
            </div>
          </details>
        </div>
      </div>

      <ReportButtons
        slug="buy-vs-rent-calculator"
        title="Buy vs Rent Comparison Report"
        buildPdf={() => buildBuyVsRentPdf({ state: s, settings, reportDate: todayISO() })}
      />
    </div>
  );
}
