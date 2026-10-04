/**
 * Mortgage Payment PDF report builder.
 * Ported 1:1 in STRUCTURE from the legacy window.pdfMortgage builder:
 * same sections, tables and tips logic — reading from a typed state
 * object instead of the DOM.
 */
import {
  makeReport,
  pdfTitle,
  pdfHighlight,
  pdfTable,
  pdfSubtext,
  pdfHeading,
  pdfTips,
  finishReport,
  type ReportCtx,
  type PdfCell,
} from "@/lib/calculators/report";
import {
  fmtCAD,
  fmtCADmo,
  monthlyPI,
  qualifyingRate,
  termLabel,
  freqLabel,
} from "@/lib/calculators/math";
import type {
  BuiltPdf,
  PaymentFrequency,
  RateType,
  ReportInput,
} from "@/lib/calculators/types";

/** Everything the report needs — computed once in the component (single source of truth). */
export interface MortgagePaymentReportState {
  // inputs
  price: number;
  downPayment: number;
  rateType: RateType;
  rate: number;
  term: number;
  amort: number;
  freq: PaymentFrequency;
  /** e.g. "Jun 13, 2026" */
  startDateLabel: string;
  // computed numbers
  mortgageAmount: number; // loan + CMHC
  cmhc: number;
  termInterest: number;
  balanceAtRenewal: number;
  totalInterest: number;
  totalCost: number; // all payments + down payment (legacy m_totalCost)
  /** e.g. "$2,625/mo" — periodic payment with frequency suffix */
  heroValue: string;
  // pre-built schedule rows (with TOTAL row); rendered as-is via pdfTable
  termRows: PdfCell[][];
  fullRows: PdfCell[][];
}

export function buildMortgagePaymentPdf(input: ReportInput<MortgagePaymentReportState>): BuiltPdf {
  const { state: s, settings, reportDate } = input;
  let p: ReportCtx = makeReport("Mortgage", reportDate);
  p = pdfTitle(p, "Mortgage Payment Report");

  const fl = freqLabel(s.freq);
  const rateTag = s.rateType === "fixed" ? "Fixed" : "Variable";
  const qr = qualifyingRate(s.rate, settings);
  const piStress = monthlyPI(s.mortgageAmount, qr, s.amort);

  p = pdfHighlight(
    p,
    `${fl} Payment (${rateTag})`,
    s.heroValue,
    `Monthly stress test at ${qr.toFixed(2)}%: ${fmtCADmo(piStress)}`,
  );
  p = pdfSubtext(p, `Term: ${termLabel(s.term)} | Amortization: ${s.amort} years`, 9, [100, 100, 100]);

  p = pdfTable(p, ["Item", "Amount"], [
    [{ t: "Rate Type", bold: true }, `${rateTag} at ${s.rate.toFixed(2)}%`],
    [{ t: "Mortgage Term", bold: true }, termLabel(s.term)],
    [{ t: "Amortization", bold: true }, `${s.amort} years`],
    [{ t: "Property Price", bold: true }, fmtCAD(s.price)],
    [{ t: "Down Payment", bold: true }, fmtCAD(s.downPayment)],
    [{ t: "Mortgage Amount", bold: true }, fmtCAD(s.mortgageAmount)],
    [{ t: "CMHC Insurance", bold: true }, s.cmhc > 0 ? fmtCAD(s.cmhc) : "Waived"],
    [{ t: `Interest Over ${termLabel(s.term)}`, bold: true }, fmtCAD(s.termInterest)],
    [{ t: "Balance at Renewal", bold: true }, fmtCAD(s.balanceAtRenewal)],
    [{ t: `Total Interest (${s.amort}yr)`, bold: true }, fmtCAD(s.totalInterest)],
    [{ t: "Total Cost", bold: true }, fmtCAD(s.totalCost)],
  ]);

  p = pdfSubtext(p, `Payment Start Date: ${s.startDateLabel} | Frequency: ${fl}`, 9, [100, 100, 100]);

  if (s.termRows.length > 0) {
    p = pdfHeading(p, `Term Schedule (${termLabel(s.term)}, ${fl})`);
    p = pdfTable(p, ["#", "Date", "Payment", "Interest", "Principal", "Balance"], s.termRows);
  }
  if (s.fullRows.length > 0) {
    p = pdfHeading(p, `Full Amortization Schedule (${s.amort} years, ${fl})`);
    p = pdfTable(p, ["#", "Date", "Payment", "Interest", "Principal", "Balance"], s.fullRows);
  }

  // Tips — same conditional logic as legacy
  const tips: string[] = [];
  const dnPct = s.price > 0 ? (s.downPayment / s.price) * 100 : 0;
  if (dnPct < 20) {
    tips.push(
      "CMHC Insurance: Your down payment is below 20%, which requires CMHC mortgage insurance. Increasing to 20% eliminates this cost.",
    );
  }
  if (s.rate > 5) {
    tips.push(
      `Rate Alert: Your rate of ${s.rate.toFixed(2)}% is above 5%. Consider speaking with a broker about lower options or shorter terms.`,
    );
  }
  if (s.freq === "weekly" || s.freq === "biweekly") {
    tips.push(
      `Accelerated Payments: ${fl} payments reduce your total interest and help you pay off your mortgage faster compared to monthly payments.`,
    );
  }
  tips.push(
    "Amortization: Shortening your amortization from 30 to 25 years can save tens of thousands in interest over the life of the mortgage.",
  );
  tips.push(
    "Prepayment: Most mortgages allow 15-20% annual lump-sum prepayments. Even small extra payments can shave years off your mortgage.",
  );
  p = pdfTips(p, "Mortgage Tips & Insights", tips);

  return finishReport(p, "Mortgage");
}
