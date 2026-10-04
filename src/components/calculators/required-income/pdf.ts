/**
 * Required Income Calculator — PDF report builder.
 * Ported 1:1 from the legacy window.pdfIncome (no DOM reads).
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

export interface RequiredIncomeReportState {
  price: number;
  down: number;
  rate: number;
  term: number;
  amort: number;
  tax: number;
  heat: number;
  condo: number;
  debts: number;
  mortgage: number;
  piQualifying: number;
  housing: number;
  reqIncome: number;
  qualifyingRate: number;
}

export function buildRequiredIncomePdf({
  state: s,
  reportDate,
}: ReportInput<RequiredIncomeReportState>): BuiltPdf {
  let p = makeReport("RequiredIncome", reportDate);
  p = pdfTitle(p, "Required Income Report");

  p = pdfHighlight(
    p,
    "Minimum Required Income",
    fmtCAD(s.reqIncome),
    `or ${fmtCADmo(s.reqIncome / 12)}`,
  );
  p = pdfSubtext(
    p,
    `Rate: ${s.rate.toFixed(2)}% | Term: ${termLabel(s.term)} | Amortization: ${s.amort} years`,
  );

  p = pdfTable(p, ["Item", "Value"], [
    [{ t: "Interest Rate", bold: true }, `${s.rate.toFixed(2)}%`],
    [{ t: "Mortgage Term", bold: true }, termLabel(s.term)],
    [{ t: "Amortization", bold: true }, `${s.amort} years`],
    [{ t: "Property Price", bold: true }, fmtCAD(s.price)],
    [{ t: "Mortgage Amount", bold: true }, fmtCAD(s.mortgage)],
    [{ t: "Monthly P&I (qualifying)", bold: true }, fmtCADmo(s.piQualifying)],
    [{ t: "Monthly Housing Cost", bold: true }, fmtCADmo(s.housing)],
    [{ t: "Qualifying Rate", bold: true }, `${s.qualifyingRate.toFixed(2)}%`],
  ]);

  p = pdfTips(p, "Income Tips", [
    "Combined Income: Lenders consider combined household income from all applicants. A co-applicant can significantly boost your qualifying power.",
    "Debt Reduction: Paying down credit cards, car loans, and student loans before applying can lower your required income.",
    "Additional Income: Overtime, bonuses, and investment income may be included if you can provide 2-year history.",
  ]);

  return finishReport(p, "RequiredIncome");
}
