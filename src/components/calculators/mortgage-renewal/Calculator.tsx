"use client";
/**
 * Mortgage Renewal Calculator — compare current vs renewal rate options.
 * Slug: mortgage-renewal-calculator
 */
import { useCallback, useMemo, useState } from "react";
import type { CalculatorSettings, RateType } from "@/lib/calculators/types";
import { fmtCAD, fmtCADmo, monthlyPI, nominalTermSummary, termLabel, todayISO } from "@/lib/calculators/math";
import { Field, Slider, Segmented, Card, ResultHero, MetricRow } from "../ui";
import { ReportButtons } from "../ReportButtons";
import { buildMortgageRenewalPdf, type MortgageRenewalReportState } from "./pdf";

const TERM_OPTIONS = [
  { value: "0.5", label: "6 Mo" },
  { value: "1", label: "1 Yr" },
  { value: "2", label: "2 Yr" },
  { value: "3", label: "3 Yr" },
  { value: "5", label: "5 Yr" },
  { value: "7", label: "7 Yr" },
  { value: "10", label: "10 Yr" },
];

export function MortgageRenewalCalculator({ settings }: { settings: CalculatorSettings }) {
  const [balance, setBalance] = useState(350000);
  const [curRate, setCurRate] = useState(5.24);
  const [amort, setAmort] = useState(20);
  const [rateType, setRateType] = useState<RateType>("fixed");
  const [newRate, setNewRate] = useState(3.99);
  const [term, setTerm] = useState(5);

  const state: MortgageRenewalReportState = useMemo(() => {
    const piCur = monthlyPI(balance, curRate, amort);
    const piNew = monthlyPI(balance, newRate, amort);
    const save = piCur - piNew;
    const termNew = nominalTermSummary(balance, newRate, amort, term);
    const termCur = nominalTermSummary(balance, curRate, amort, term);
    const rateTag = rateType === "fixed" ? "Fixed" : "Variable";
    return {
      balance, curRate, newRate, rateType, term, amort,
      piCurrent: piCur,
      piNew,
      save,
      saveLabel: (save >= 0 ? "" : "-") + fmtCADmo(Math.abs(save)),
      compare: `${fmtCAD(balance)} at ${curRate.toFixed(2)}% vs ${newRate.toFixed(2)}% ${rateTag} (${termLabel(term)})`,
      saveMo: (save >= 0 ? "- " : "+ ") + fmtCADmo(Math.abs(save)),
      intTermNew: termNew.intPaid,
      intTermCur: termCur.intPaid,
      balRenew: termNew.balance,
      intDiff:
        (termCur.intPaid >= termNew.intPaid ? "- " : "+ ") +
        fmtCAD(Math.abs(termCur.intPaid - termNew.intPaid)),
    };
  }, [balance, curRate, newRate, rateType, term, amort]);

  const buildPdf = useCallback(
    () => buildMortgageRenewalPdf({ state, settings, reportDate: todayISO() }),
    [state, settings],
  );

  const saving = state.save >= 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <div className="space-y-6">
        <Card title="Current Mortgage">
          <div className="space-y-5">
            <Field label={`Current Balance Remaining — ${fmtCAD(balance)}`}>
              <Slider value={balance} onChange={setBalance} min={10000} max={1500000} step={5000} />
            </Field>
            <Field label={`Current Rate — ${curRate.toFixed(2)}%`}>
              <Slider value={curRate} onChange={setCurRate} min={1} max={12} step={0.05} />
            </Field>
            <Field label={`Remaining Amortization — ${amort} years`}>
              <Slider value={amort} onChange={setAmort} min={5} max={35} step={1} />
            </Field>
          </div>
        </Card>

        <Card title="New Rate Options">
          <div className="space-y-5">
            <Field label="New Rate Type">
              <Segmented<RateType>
                value={rateType}
                onChange={setRateType}
                options={[
                  { value: "fixed", label: "Fixed" },
                  { value: "variable", label: "Variable" },
                ]}
              />
            </Field>
            <Field label={`New ${rateType === "fixed" ? "Fixed" : "Variable"} Rate — ${newRate.toFixed(2)}%`}>
              <Slider value={newRate} onChange={setNewRate} min={1} max={12} step={0.05} />
            </Field>
            <Field label="New Term" hint="Your new rate lock period at renewal">
              <Segmented
                value={String(term)}
                onChange={(v) => setTerm(parseFloat(v))}
                options={TERM_OPTIONS}
              />
            </Field>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <ResultHero
          label="Monthly Savings at Renewal"
          value={state.saveLabel}
          sub={state.compare}
        />

        <Card title="Payment Comparison">
          <MetricRow label="Current Payment" value={fmtCADmo(state.piCurrent)} />
          <MetricRow label="New Payment" value={fmtCADmo(state.piNew)} />
          <MetricRow
            label="Monthly Savings"
            value={state.saveMo}
            strong
            tone={saving ? "good" : "bad"}
          />
        </Card>

        <Card title={`Interest Over New Term — ${termLabel(term)}`}>
          <MetricRow label={`Interest Over ${termLabel(term)}`} value={fmtCAD(state.intTermNew)} strong />
          <MetricRow label="Balance at Next Renewal" value={fmtCAD(state.balRenew)} />
        </Card>

        <Card title="Comparison">
          <MetricRow label="Current — Interest Over Term" value={fmtCAD(state.intTermCur)} />
          <MetricRow label="New — Interest Over Term" value={fmtCAD(state.intTermNew)} />
          <MetricRow label="Interest Savings" value={state.intDiff} strong tone={saving ? "good" : "bad"} />
        </Card>

        <ReportButtons slug="mortgage-renewal-calculator" title="Mortgage Renewal Calculator" buildPdf={buildPdf} />
      </div>
    </div>
  );
}
