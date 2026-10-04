/**
 * Maximum Mortgage Calculator — PDF report builder.
 * Ported 1:1 from the legacy window.pdfMaxMortgage (no DOM reads).
 */
import {
  makeReport,
  pdfTitle,
  pdfHighlight,
  pdfSubtext,
  pdfTable,
  pdfTips,
  finishReport,
} from "@/lib/calculators/report";
import type { ReportInput, BuiltPdf } from "@/lib/calculators/types";
import { fmtCAD, fmtCADmo, termLabel } from "@/lib/calculators/math";

export interface MaximumMortgageReportState {
  income: number;
  debts: number;
  tax: number;
  heat: number;
  condo: number;
  rate: number;
  term: number;
  amort: number;
  maxMortgage: number;
  piActual: number;
  gds: number;
  tds: number;
  qualifyingRate: number;
}

export function buildMaximumMortgagePdf({
  state: s,
  reportDate,
}: ReportInput<MaximumMortgageReportState>): BuiltPdf {
  let p = makeReport("MaxMortgage", reportDate);
  p = pdfTitle(p, "Maximum Mortgage Report");

  p = pdfHighlight(
    p,
    "Maximum Mortgage",
    fmtCAD(s.maxMortgage),
    `Monthly P&I at ${s.rate.toFixed(2)}%: ${fmtCADmo(s.piActual)}`,
  );
  p = pdfSubtext(
    p,
    `Rate: ${s.rate.toFixed(2)}% | Term: ${termLabel(s.term)} | Amortization: ${s.amort} years`,
  );

  p = pdfTable(p, ["Metric", "Value"], [
    [{ t: "Interest Rate", bold: true }, `${s.rate.toFixed(2)}%`],
    [{ t: "Mortgage Term", bold: true }, termLabel(s.term)],
    [{ t: "Amortization", bold: true }, `${s.amort} years`],
    [{ t: "GDS Ratio", bold: true }, `${s.gds.toFixed(1)}%`],
    [{ t: "TDS Ratio", bold: true }, `${s.tds.toFixed(1)}%`],
    [{ t: "Qualifying Rate", bold: true }, `${s.qualifyingRate.toFixed(2)}%`],
  ]);

  p = pdfTips(p, "Max Mortgage Tips", [
    `Stress Test: The qualifying rate of ${s.qualifyingRate.toFixed(2)}% is used by lenders to ensure you can afford payments at higher rates. This is a Bank of Canada requirement.`,
    "Increase Capacity: Reduce existing debts, increase your income, or lower other housing costs to qualify for a larger mortgage.",
    "Pre-Approval: Get a pre-approval to lock in your maximum mortgage amount and rate for 60-120 days.",
  ]);

  return finishReport(p, "MaxMortgage");
}
