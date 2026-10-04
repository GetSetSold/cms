"use client";
/**
 * Mortgage Payment Calculator — ported from the legacy single-file calculators page.
 * All math via src/lib/calculators/math.ts (bit-identical formulas).
 */
import { useMemo, useState } from "react";
import {
  Field,
  Segmented,
  Slider,
  Card,
  ResultHero,
  MetricRow,
  SimpleTable,
} from "@/components/calculators/ui";
import { ReportButtons } from "@/components/calculators/ReportButtons";
import {
  fmtCAD,
  fmtCADmo,
  periodicPI,
  monthlyPI,
  qualifyingRate,
  cmhcPremium,
  termSummary,
  amortizationSchedule,
  termLabel,
  freqLabel,
  todayISO,
} from "@/lib/calculators/math";
import type {
  AmortRow,
  CalculatorSettings,
  PaymentFrequency,
  RateType,
} from "@/lib/calculators/types";
import {
  buildMortgagePaymentPdf,
  type MortgagePaymentReportState,
} from "./pdf";
import type { PdfCell } from "@/lib/calculators/report";

const SLUG = "mortgage-payment-calculator";
const TITLE = "Mortgage Payment Calculator";

const TERM_OPTIONS = [
  { value: "0.5", label: "6 Mo" },
  { value: "1", label: "1 Yr" },
  { value: "2", label: "2 Yr" },
  { value: "3", label: "3 Yr" },
  { value: "5", label: "5 Yr" },
  { value: "7", label: "7 Yr" },
  { value: "10", label: "10 Yr" },
];

const FREQ_OPTIONS: { value: PaymentFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-Weekly" },
  { value: "monthly", label: "Monthly" },
];

const SCHED_COLS = ["#", "Date", "Payment", "Interest", "Principal", "Balance"];

function freqSuffix(freq: PaymentFrequency): string {
  return freq === "weekly" ? "/wk" : freq === "biweekly" ? "/2wk" : "/mo";
}

function schedToUiRows(rows: AmortRow[]): (string | number)[][] {
  return rows.map((r) => [r.n, r.date, fmtCAD(r.payment), fmtCAD(r.interest), fmtCAD(r.principal), fmtCAD(r.balance)]);
}

function schedToPdfRows(rows: AmortRow[]): PdfCell[][] {
  const out: PdfCell[][] = rows.map((r) => [
    String(r.n),
    r.date,
    fmtCAD(r.payment),
    fmtCAD(r.interest),
    fmtCAD(r.principal),
    fmtCAD(r.balance),
  ]);
  const tPmt = rows.reduce((a, r) => a + r.payment, 0);
  const tInt = rows.reduce((a, r) => a + r.interest, 0);
  const tPrin = rows.reduce((a, r) => a + r.principal, 0);
  out.push([
    { t: "", bold: true },
    { t: "TOTAL", bold: true },
    { t: fmtCAD(tPmt), bold: true },
    { t: fmtCAD(tInt), bold: true },
    { t: fmtCAD(tPrin), bold: true },
    { t: "", bold: true },
  ]);
  return out;
}

export function MortgagePaymentCalculator({ settings }: { settings: CalculatorSettings }) {
  // Inputs — defaults match the legacy page
  const [price, setPrice] = useState(500000);
  const [down, setDown] = useState(25000);
  const [rateType, setRateType] = useState<RateType>("fixed");
  const [rate, setRate] = useState(4.84);
  const [term, setTerm] = useState("5");
  const [amort, setAmort] = useState(30);
  const [freq, setFreq] = useState<PaymentFrequency>("monthly");
  const [startDate, setStartDate] = useState(todayISO());

  const termNum = Number(term);
  const fl = freqLabel(freq);
  const suffix = freqSuffix(freq);
  const rateTag = rateType === "fixed" ? "Fixed" : "Variable";

  const calc = useMemo(() => {
    const loan = Math.max(0, price - down);
    const cm = cmhcPremium(loan, price, settings);
    const tm = loan + cm;
    const qr = qualifyingRate(rate, settings);
    const pmt = periodicPI(tm, rate, amort, freq);
    const piStress = monthlyPI(tm, qr, amort);
    const ppY = freq === "weekly" ? 52 : freq === "biweekly" ? 26 : 12;
    const totalPeriods = amort * ppY;
    const totalPayAll = pmt * totalPeriods;
    const totalInt = totalPayAll - tm;
    const termInfo = termSummary(tm, rate, amort, termNum, freq);
    const totalCost = totalPayAll + down;

    // Fixed vs variable — the other rate is ±0.66 (typical spread)
    const fixedRate = rateType === "fixed" ? rate : rate - 0.66;
    const variableRate = rateType === "fixed" ? rate + 0.66 : rate;
    const pmtFixed = periodicPI(tm, fixedRate, amort, freq);
    const pmtVar = periodicPI(tm, variableRate, amort, freq);
    const tFixed = termSummary(tm, fixedRate, amort, termNum, freq);
    const tVar = termSummary(tm, variableRate, amort, termNum, freq);
    const intFixedFull = pmtFixed * totalPeriods - tm;
    const intVarFull = pmtVar * totalPeriods - tm;
    const diff = Math.abs(tFixed.intPaid - tVar.intPaid);
    const fixedBetter = tFixed.intPaid <= tVar.intPaid;

    const termSched = amortizationSchedule(tm, rate, amort, freq, startDate, Math.min(termNum, amort));
    const fullSched = amortizationSchedule(tm, rate, amort, freq, startDate, amort);

    return {
      loan, cm, tm, qr, pmt, piStress, totalPayAll, totalInt, termInfo, totalCost,
      fixedRate, variableRate, pmtFixed, pmtVar,
      intFixedT: tFixed.intPaid, intVarT: tVar.intPaid,
      balFixed: tFixed.balance, balVar: tVar.balance,
      intFixedFull, intVarFull, diff, fixedBetter,
      termSched, fullSched,
    };
  }, [price, down, rate, rateType, termNum, amort, freq, startDate, settings]);

  const startLabel = useMemo(() => {
    const d = new Date(startDate + "T12:00:00");
    return Number.isNaN(d.getTime())
      ? startDate
      : d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
  }, [startDate]);

  const downPct = price > 0 ? (down / price) * 100 : 0;

  const buildState = (): MortgagePaymentReportState => ({
    price,
    downPayment: down,
    rateType,
    rate,
    term: termNum,
    amort,
    freq,
    startDateLabel: startLabel,
    mortgageAmount: calc.tm,
    cmhc: calc.cm,
    termInterest: calc.termInfo.intPaid,
    balanceAtRenewal: calc.termInfo.balance,
    totalInterest: calc.totalInt,
    totalCost: calc.totalCost,
    heroValue: `${fmtCAD(calc.pmt)}${suffix}`,
    termRows: schedToPdfRows(calc.termSched),
    fullRows: schedToPdfRows(calc.fullSched),
  });

  const metricBoxes: { label: string; value: string; sub?: string; tone?: "good" }[] = [
    { label: "Mortgage Amount", value: fmtCAD(calc.tm) },
    { label: "Down Payment", value: fmtCAD(down) },
    { label: "CMHC Insurance", value: calc.cm > 0 ? fmtCAD(calc.cm) : "Waived", tone: calc.cm > 0 ? undefined : "good" },
    { label: "Interest Over Term", value: fmtCAD(calc.termInfo.intPaid), sub: termLabel(termNum) },
    { label: "Balance at Renewal", value: fmtCAD(calc.termInfo.balance), sub: `after ${termLabel(termNum)}` },
    { label: "Total Interest (Full)", value: fmtCAD(calc.totalInt) },
    { label: "Total Cost", value: fmtCAD(calc.totalCost) },
  ];

  const fvRows: (string | number)[][] = [
    [`${fl} Payment`, `${fmtCAD(calc.pmtFixed)}${suffix}`, `${fmtCAD(calc.pmtVar)}${suffix}`],
    [`Interest Over ${termLabel(termNum)}`, fmtCAD(calc.intFixedT), fmtCAD(calc.intVarT)],
    ["Balance at Renewal", fmtCAD(calc.balFixed), fmtCAD(calc.balVar)],
    [`Total Interest (Full ${amort}yr)`, fmtCAD(calc.intFixedFull), fmtCAD(calc.intVarFull)],
  ];

  const renderSchedule = (rows: AmortRow[], note: string) => {
    const shown = rows.slice(0, 60);
    return (
      <div>
        <SimpleTable cols={SCHED_COLS} rows={schedToUiRows(shown)} />
        {rows.length > 60 && (
          <p className="mt-2 text-[12px] italic text-muted">
            Showing first 60 of {rows.length} payments — {note}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[400px_1fr]">
      {/* LEFT: inputs */}
      <div>
        <Card title="Mortgage Details">
          <div className="flex flex-col gap-4">
            <Field label="Property Price">
              <div className="flex items-center gap-3">
                <div className="flex-1"><Slider value={price} onChange={setPrice} min={50000} max={3000000} step={10000} /></div>
                <span className="w-24 shrink-0 text-right text-[14px] font-semibold text-ink">{fmtCAD(price)}</span>
              </div>
            </Field>
            <Field
              label="Down Payment"
              hint={`${downPct.toFixed(1)}%${downPct < 20 ? " — CMHC insurance required" : " — No CMHC needed"}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex-1"><Slider value={down} onChange={setDown} min={0} max={1500000} step={5000} /></div>
                <span className="w-24 shrink-0 text-right text-[14px] font-semibold text-ink">{fmtCAD(down)}</span>
              </div>
            </Field>
            <Field label="Rate Type">
              <Segmented<RateType>
                value={rateType}
                onChange={setRateType}
                options={[{ value: "fixed", label: "Fixed" }, { value: "variable", label: "Variable" }]}
              />
            </Field>
            <Field label={rateType === "fixed" ? "Fixed Rate" : "Variable Rate"}>
              <div className="flex items-center gap-3">
                <div className="flex-1"><Slider value={rate} onChange={setRate} min={1} max={12} step={0.05} /></div>
                <span className="w-16 shrink-0 text-right text-[14px] font-semibold text-ink">{rate.toFixed(2)}%</span>
              </div>
            </Field>
            <Field label="Mortgage Term" hint="Term is your rate lock period; amortization is total payoff time">
              <Segmented value={term} onChange={setTerm} options={TERM_OPTIONS} />
            </Field>
            <Field label="Amortization">
              <div className="flex items-center gap-3">
                <div className="flex-1"><Slider value={amort} onChange={setAmort} min={5} max={35} step={1} /></div>
                <span className="w-20 shrink-0 text-right text-[14px] font-semibold text-ink">{amort} years</span>
              </div>
            </Field>
            <Field label="Payment Frequency">
              <Segmented<PaymentFrequency> value={freq} onChange={setFreq} options={FREQ_OPTIONS} />
            </Field>
            <Field label="Payment Start Date" hint="Choose your first payment date (or today's date as default). Schedules below are calculated from this date.">
              <input
                type="date"
                value={startDate}
                onChange={(e) => e.target.value && setStartDate(e.target.value)}
                className="w-full rounded-[var(--radius-sm)] border border-line bg-white px-3 py-2.5 text-[15px] text-ink outline-none focus:border-accent"
              />
            </Field>
          </div>
        </Card>
      </div>

      {/* RIGHT: results */}
      <div className="flex flex-col gap-5">
        <ResultHero
          label={`${fl} Payment (${rateTag}, ${rate.toFixed(2)}%)`}
          value={`${fmtCAD(calc.pmt)}${suffix}`}
          sub={`Monthly stress test at ${calc.qr.toFixed(2)}%: ${fmtCADmo(calc.piStress)}`}
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {metricBoxes.map((m) => (
            <div key={m.label} className="rounded-[var(--radius-sm)] border border-line bg-white p-3.5 shadow-[var(--shadow)]">
              <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">{m.label}</div>
              <div className={`mt-1 text-[17px] font-bold tabular-nums ${m.tone === "good" ? "text-emerald-600" : "text-ink"}`}>{m.value}</div>
              {m.sub && <div className="mt-0.5 text-[11px] text-muted">{m.sub}</div>}
            </div>
          ))}
        </div>

        <Card title="Fixed vs Variable Rate Comparison">
          <SimpleTable
            cols={["Metric", `Fixed (${calc.fixedRate.toFixed(2)}%)`, `Variable (${calc.variableRate.toFixed(2)}%)`]}
            rows={fvRows}
          />
          <div className={`mt-3 rounded-[var(--radius-sm)] px-4 py-2.5 text-[13.5px] font-semibold ${calc.fixedBetter ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            {calc.fixedBetter
              ? `Fixed rate saves you ${fmtCAD(calc.diff)} in interest over the ${termLabel(termNum)}`
              : `Variable rate would cost ${fmtCAD(calc.diff)} more in interest over the ${termLabel(termNum)}`}
          </div>
        </Card>

        <Card title="Cost Breakdown">
          <MetricRow label="Principal" value={fmtCAD(calc.loan)} />
          <MetricRow label="Interest" value={fmtCAD(calc.totalInt)} />
          <MetricRow label="CMHC Premium" value={calc.cm > 0 ? fmtCAD(calc.cm) : "Waived"} tone={calc.cm > 0 ? undefined : "good"} />
          <MetricRow label="Total Over Amortization" value={fmtCAD(calc.totalPayAll + down + calc.cm)} strong />
        </Card>

        <details className="rounded-[var(--radius-md)] border border-line bg-white shadow-[var(--shadow)]" open>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
            <span className="text-[16px] font-bold text-ink">Term Schedule</span>
            <span className="text-[12px] text-muted">{termLabel(termNum)} | {fl} Payment | {fmtCAD(calc.tm)} mortgage</span>
          </summary>
          <div className="border-t border-line px-5 py-4">
            {renderSchedule(calc.termSched, "the complete schedule is included in the PDF report.")}
          </div>
        </details>

        <details className="rounded-[var(--radius-md)] border border-line bg-white shadow-[var(--shadow)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
            <span className="text-[16px] font-bold text-ink">Full Amortization Schedule</span>
            <span className="text-[12px] text-muted">{amort} years | {fl} Payment | {fmtCAD(calc.tm)} mortgage</span>
          </summary>
          <div className="border-t border-line px-5 py-4">
            {renderSchedule(calc.fullSched, "the complete schedule is included in the PDF report.")}
          </div>
        </details>

        <ReportButtons
          slug={SLUG}
          title={TITLE}
          buildPdf={() => buildMortgagePaymentPdf({ state: buildState(), settings, reportDate: todayISO() })}
        />
      </div>
    </div>
  );
}
