"use client";
/**
 * Down Payment Comparison Calculator.
 * Compares 5/10/15/20% down payments side by side with a buy-now-vs-wait
 * analysis. Layout: inputs left, results right; wide comparison table below.
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
} from "../ui";
import { ReportButtons } from "../ReportButtons";
import { buildDownPaymentPdf, computeDownPayment } from "./pdf";

export function DownPaymentCalculator({ settings }: { settings: CalculatorSettings }) {
  const [price, setPrice] = useState(600000);
  const [rate, setRate] = useState(4.99);
  const [amort, setAmort] = useState(25);
  const [monthlySave, setMonthlySave] = useState(1000);

  const state = useMemo(
    () => computeDownPayment({ price, rate, amort, monthlySave }, settings),
    [price, rate, amort, monthlySave, settings],
  );
  const best = state.rows[state.bestIdx];

  // "Should You Wait?" analysis — ported from legacy calcDownPay
  const waitLines = useMemo(() => {
    if (monthlySave <= 0) return [];
    const lines: string[] = [];
    for (let i = 0; i < state.rows.length - 1; i++) {
      const lower = state.rows[i];
      const higher = state.rows[i + 1];
      const extra = higher.downAmt - lower.downAmt;
      const months = Math.ceil(extra / monthlySave);
      const intSaved = lower.totalInt - higher.totalInt;
      lines.push(
        `${lower.pct}% → ${higher.pct}%: ${months} months to save ${fmtCAD(extra)}. Extra interest saved: ${fmtCAD(intSaved)}.`,
      );
    }
    return lines;
  }, [state, monthlySave]);

  const recommendation = useMemo(() => {
    if (monthlySave <= 0)
      return "Set a monthly savings amount to see how long it would take to reach each down payment level and whether waiting makes financial sense.";
    let s = "";
    if (monthlySave >= 2000) {
      s += `With your savings capacity of ${fmtCADmo(monthlySave)}, you could reach 20% down in about ${Math.ceil(
        (state.rows[3].downAmt - state.rows[0].downAmt) / monthlySave,
      )} months. However, waiting means paying rent and potentially facing higher home prices. `;
    }
    s +=
      "A higher down payment reduces CMHC insurance and monthly payments, but the opportunity cost of waiting should be considered. If home prices rise faster than your savings rate, buying sooner may be better.";
    return s;
  }, [monthlySave, state]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <Card title="Property & Financing">
          <div className="space-y-4">
            <Field label="Home Price">
              <CurrencyInput value={price} onChange={setPrice} />
            </Field>
            <Field label="Mortgage Rate">
              <NumberInput value={rate} onChange={setRate} suffix="%" />
            </Field>
            <Field label="Amortization">
              <NumberInput value={amort} onChange={setAmort} suffix="years" />
            </Field>
            <Field
              label="Monthly Savings Amount"
              hint="How much you could save per month if you waited instead of buying now"
            >
              <CurrencyInput value={monthlySave} onChange={setMonthlySave} />
            </Field>
          </div>
        </Card>

        <div className="space-y-6">
          <ResultHero
            label="Recommended Down Payment"
            value={`${best.pct}% Down Payment`}
            sub={`Saves you ${fmtCAD(state.rows[0].totalCost - best.totalCost)} vs 5% over ${amort} years`}
          />
          <Card title="Should You Wait or Buy Now?">
            {waitLines.length > 0 ? (
              <div className="mb-3">
                <div className="mb-2 text-[13px] font-bold text-ink">Months to Save for Each Level</div>
                <ul className="space-y-1.5">
                  {waitLines.map((l, i) => (
                    <li key={i} className="text-[13.5px] leading-6 text-muted">
                      {l}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="mb-2 text-[13px] font-bold text-ink">Recommendation</div>
            <p className="text-[13.5px] leading-6 text-muted">{recommendation}</p>
          </Card>
        </div>
      </div>

      <Card title="Side-by-Side Comparison">
        <SimpleTable
          cols={["Down %", "Down Payment", "CMHC Insurance", "Monthly Payment", "Total Cost"]}
          rows={state.rows.map((r, i) => [
            `${r.pct}%${i === state.bestIdx ? " ★" : ""}`,
            fmtCAD(r.downAmt),
            r.cmhc > 0 ? fmtCAD(r.cmhc) : "None",
            fmtCADmo(r.monthly),
            fmtCAD(r.totalCost),
          ])}
        />
        <div className="mt-4">
          <MetricRow label="Mortgage Amount (best option)" value={fmtCAD(best.mortAmt)} />
          <MetricRow label="Total Interest (best option)" value={fmtCAD(best.totalInt)} />
        </div>
      </Card>

      <ReportButtons
        slug="down-payment-comparison-calculator"
        title="Down Payment Comparison Report"
        buildPdf={() => buildDownPaymentPdf({ state, settings, reportDate: todayISO() })}
      />
    </div>
  );
}
