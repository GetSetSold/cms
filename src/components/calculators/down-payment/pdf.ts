/**
 * Down Payment Comparison — report state, computation, and PDF builder.
 * Ported 1:1 from the legacy calcDownPay / window.pdfDownPay so results and
 * report structure are identical to the old site.
 *
 * One deliberate fix: legacy placed the "★" marker while bestIdx was still
 * being computed, so every row got a star. Here the best column is marked
 * after bestIdx is final.
 */
import { cmhcPremium, fmtCAD, fmtCADmo, monthlyPI } from "@/lib/calculators/math";
import {
  finishReport,
  makeReport,
  pdfSubtext,
  pdfTable,
  pdfTips,
  pdfTitle,
} from "@/lib/calculators/report";
import type { BuiltPdf, CalculatorSettings, ReportInput } from "@/lib/calculators/types";

export interface DownPaymentInputs {
  price: number;
  rate: number;
  amort: number;
  monthlySave: number;
}

export interface DownPaymentRow {
  pct: number;
  downAmt: number;
  loan: number;
  cmhc: number;
  mortAmt: number;
  monthly: number;
  totalInt: number;
  totalCost: number;
}

export interface DownPaymentReportState extends DownPaymentInputs {
  rows: DownPaymentRow[];
  bestIdx: number;
}

const PCTS = [5, 10, 15, 20];

export function computeDownPayment(
  inputs: DownPaymentInputs,
  settings: CalculatorSettings,
): DownPaymentReportState {
  const { price, rate, amort } = inputs;
  const rows: DownPaymentRow[] = PCTS.map((pct) => {
    const downAmt = (price * pct) / 100;
    const loan = price - downAmt;
    const cmhc = cmhcPremium(loan, price, settings);
    const mortAmt = loan + cmhc;
    const monthly = monthlyPI(mortAmt, rate, amort);
    const totalMonths = amort * 12;
    const totalInt = monthly * totalMonths - mortAmt;
    const totalCost = monthly * totalMonths + downAmt;
    return { pct, downAmt, loan, cmhc, mortAmt, monthly, totalInt, totalCost };
  });
  let bestIdx = 0;
  rows.forEach((r, i) => {
    if (r.totalCost < rows[bestIdx].totalCost) bestIdx = i;
  });
  return { ...inputs, rows, bestIdx };
}

export function buildDownPaymentPdf({
  state,
  reportDate,
}: ReportInput<DownPaymentReportState>): BuiltPdf {
  let p = makeReport("DownPay", reportDate);
  p = pdfTitle(p, "Down Payment Comparison Report");
  p = pdfSubtext(
    p,
    `Home Price: ${fmtCAD(state.price)} | Rate: ${state.rate.toFixed(2)}% | Amortization: ${state.amort} years`,
    10,
    [80, 80, 80],
  );
  const rows = state.rows.map((r, i) => {
    const best = i === state.bestIdx;
    return [
      { t: `${r.pct}% Down Payment${best ? " ★" : ""}`, bold: best },
      { t: fmtCAD(r.downAmt), bold: best },
      { t: r.cmhc > 0 ? fmtCAD(r.cmhc) : "None", bold: best },
      { t: fmtCADmo(r.monthly), bold: best },
      { t: fmtCAD(r.totalCost), bold: best },
    ];
  });
  p = pdfTable(p, ["Down %", "Down Payment", "CMHC", "Monthly Pmt", "Total Cost"], rows);
  p = pdfTips(p, "Down Payment Tips", [
    "20% Eliminates CMHC: Putting 20% down means no mortgage insurance premium, saving you thousands.",
    "5% Gets You In: With just 5% down you can buy now, but you will pay CMHC insurance (4% of the mortgage amount).",
    "Opportunity Cost: Consider what your savings could earn if invested while you wait to accumulate a larger down payment.",
    "Home Price Risk: If home prices rise while you save, you may need to save even more. Time the market carefully.",
  ]);
  return finishReport(p, "DownPay");
}
