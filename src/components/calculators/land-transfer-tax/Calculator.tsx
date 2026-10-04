"use client";
/**
 * Ontario Land Transfer Tax Calculator — Ontario & Toronto.
 * Slug: land-transfer-tax-calculator-ontario
 */
import { useCallback, useMemo, useState } from "react";
import type { CalculatorSettings } from "@/lib/calculators/types";
import {
  fmtCAD,
  ontarioLTT,
  torontoLTT,
  lttBracketBreakdown,
  todayISO,
} from "@/lib/calculators/math";
import {
  Field,
  Slider,
  Toggle,
  Card,
  ResultHero,
  MetricRow,
  SimpleTable,
} from "../ui";
import { ReportButtons } from "../ReportButtons";
import { buildLandTransferTaxPdf, type LandTransferTaxReportState } from "./pdf";

export function LandTransferTaxCalculator({ settings }: { settings: CalculatorSettings }) {
  const [price, setPrice] = useState(800000);
  const [ftb, setFtb] = useState(false);
  const [toronto, setToronto] = useState(false);

  const state: LandTransferTaxReportState = useMemo(() => {
    const onLtt = ontarioLTT(price);
    const toLtt = toronto ? torontoLTT(price) : 0;
    const rebate = ftb ? settings.onRebate + (toronto ? settings.toRebate : 0) : 0;
    const total = Math.max(0, onLtt + toLtt - rebate);
    return { price, ftb, toronto, onLtt, toLtt, rebate, total };
  }, [price, ftb, toronto, settings]);

  const brackets = useMemo(() => lttBracketBreakdown(price), [price]);

  const rebateSub = ftb
    ? `Rebates applied: Ontario ${fmtCAD(settings.onRebate)}${
        toronto ? ` + Toronto ${fmtCAD(settings.toRebate)}` : ""
      }`
    : "No rebates applied";

  const buildPdf = useCallback(
    () => buildLandTransferTaxPdf({ state, settings, reportDate: todayISO() }),
    [state, settings],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <div>
        <Card title="Property Details">
          <div className="space-y-5">
            <Field label={`Purchase Price — ${fmtCAD(price)}`}>
              <Slider value={price} onChange={setPrice} min={100000} max={5000000} step={10000} />
            </Field>
            <Toggle checked={ftb} onChange={setFtb} label="First-Time Home Buyer" />
            <Toggle checked={toronto} onChange={setToronto} label="Property is in Toronto" />
          </div>
        </Card>
      </div>
      <div className="space-y-6">
        <ResultHero label="Total Land Transfer Tax" value={fmtCAD(state.total)} sub={rebateSub} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <div className="text-[12px] font-semibold uppercase tracking-wide text-muted">Ontario LTT</div>
            <div className="mt-1 text-[22px] font-bold text-ink tabular-nums">{fmtCAD(state.onLtt)}</div>
          </Card>
          <Card>
            <div className="text-[12px] font-semibold uppercase tracking-wide text-muted">Toronto LTT (MBTT)</div>
            <div className="mt-1 text-[22px] font-bold text-ink tabular-nums">{fmtCAD(state.toLtt)}</div>
          </Card>
          <Card>
            <div className="text-[12px] font-semibold uppercase tracking-wide text-muted">First-Time Rebate</div>
            <div className="mt-1 text-[22px] font-bold text-emerald-600 tabular-nums">
              {state.ftb ? `-${fmtCAD(state.rebate)}` : "$0"}
            </div>
          </Card>
        </div>
        <Card title="Your Tax by Bracket">
          <SimpleTable
            cols={["Price Range", "Rate", "Tax"]}
            rows={brackets.map((b) => [b.label, b.rate, fmtCAD(b.tax)])}
          />
        </Card>
        <Card title="Ontario LTT Rates">
          <MetricRow label="First $55,000" value="0.5%" />
          <MetricRow label="$55,001 — $250,000" value="1.0%" />
          <MetricRow label="$250,001 — $400,000" value="1.5%" />
          <MetricRow label="$400,001 — $2,000,000" value="2.0%" />
          <MetricRow label="Over $2,000,000" value="2.5%" />
        </Card>
        <ReportButtons
          slug="land-transfer-tax-calculator-ontario"
          title="Land Transfer Tax Calculator"
          buildPdf={buildPdf}
        />
      </div>
    </div>
  );
}
