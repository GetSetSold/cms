/**
 * Mortgage Renewal Calculator — PDF report builder.
 * Ported 1:1 from the legacy window.pdfRenewal (no DOM reads).
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
import type { ReportInput, BuiltPdf, RateType } from "@/lib/calculators/types";
import { fmtCAD, fmtCADmo, termLabel } from "@/lib/calculators/math";

export interface MortgageRenewalReportState {
  balance: number;
  curRate: number;
  newRate: number;
  rateType: RateType;
  term: number;
  amort: number;
  piCurrent: number;
  piNew: number;
  save: number;
  saveLabel: string;
  compare: string;
  saveMo: string;
  intTermNew: number;
  intTermCur: number;
  balRenew: number;
  intDiff: string;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function buildMortgageRenewalPdf({
  state: s,
  reportDate,
}: ReportInput<MortgageRenewalReportState>): BuiltPdf {
  let p = makeReport("Renewal", reportDate);
  p = pdfTitle(p, "Mortgage Renewal Report");

  p = pdfHighlight(p, "Monthly Savings", s.saveLabel, s.compare);
  p = pdfSubtext(
    p,
    `New Rate Type: ${cap(s.rateType)} | New Term: ${termLabel(s.term)} | Remaining Amortization: ${s.amort} years`,
  );

  p = pdfTable(p, ["Item", "Current", "New"], [
    [{ t: "Monthly Payment", bold: true }, fmtCADmo(s.piCurrent), fmtCADmo(s.piNew)],
    [{ t: `Interest Over ${termLabel(s.term)}`, bold: true }, fmtCAD(s.intTermCur), fmtCAD(s.intTermNew)],
    [{ t: "Balance at Next Renewal", bold: true }, "", fmtCAD(s.balRenew)],
    [{ t: "Interest Savings", bold: true }, "", s.intDiff],
  ]);

  const tips: string[] = [];
  if (s.save > 0)
    tips.push(
      `Great Savings: Your new rate saves you ${fmtCADmo(s.save)}. Consider putting that difference toward extra payments to pay off your mortgage faster.`,
    );
  else
    tips.push(
      "Note: Your new rate is higher than your current rate. Consider negotiating with your existing lender or exploring variable rate options.",
    );
  tips.push(
    "Start Early: Begin shopping for renewal rates 4-6 months before your renewal date. Lenders often offer better rates to retain existing customers.",
    "Switch Lenders: Do not assume your current lender offers the best rate. Switching lenders at renewal is common and can save you thousands.",
  );
  p = pdfTips(p, "Renewal Tips", tips);

  return finishReport(p, "Renewal");
}
