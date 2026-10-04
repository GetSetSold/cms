/**
 * Purchase Cost Calculator — PDF report builder.
 * Ported 1:1 from the legacy window.pdfPurchase (no DOM reads).
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

export interface PurchaseCostReportState {
  price: number;
  down: number;
  rateType: RateType;
  rate: number;
  term: number;
  amort: number;
  tax: number;
  heat: number;
  condo: number;
  debts: number;
  income: number;
  loan: number;
  cmhc: number;
  mortgage: number;
  pi: number;
  condoHalf: number;
  totalMo: number;
  downPct: number;
  minDown: number;
  gds: number;
  tds: number;
  gdsOk: boolean;
  tdsOk: boolean;
}

const GREEN: [number, number, number] = [5, 150, 105];
const RED: [number, number, number] = [220, 38, 38];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function buildPurchaseCostPdf({
  state: s,
  settings,
  reportDate,
}: ReportInput<PurchaseCostReportState>): BuiltPdf {
  let p = makeReport("PurchaseCost", reportDate);
  p = pdfTitle(p, "Purchase Cost Report");

  p = pdfHighlight(p, "Total Monthly Cost", fmtCADmo(s.totalMo), `Mortgage P&I: ${fmtCADmo(s.pi)}`);
  p = pdfSubtext(
    p,
    `Rate: ${cap(s.rateType)} at ${s.rate.toFixed(2)}% | Term: ${termLabel(s.term)} | Amortization: ${s.amort} years`,
  );

  p = pdfTable(p, ["Item", "Amount"], [
    [{ t: "Rate Type", bold: true }, `${cap(s.rateType)} at ${s.rate.toFixed(2)}%`],
    [{ t: "Mortgage Term", bold: true }, termLabel(s.term)],
    [{ t: "Amortization", bold: true }, `${s.amort} years`],
    [{ t: "Purchase Price", bold: true }, fmtCAD(s.price)],
    [{ t: `Down Payment (${s.downPct.toFixed(1)}%)`, bold: true }, fmtCAD(s.down)],
    [{ t: "Mortgage Amount", bold: true }, fmtCAD(s.mortgage)],
    [{ t: "CMHC Insurance", bold: true }, s.cmhc > 0 ? fmtCAD(s.cmhc) : "Waived"],
    [{ t: "Min Down Payment", bold: true }, fmtCAD(s.minDown)],
    [
      { t: "GDS Ratio", bold: true },
      { t: `${s.gds.toFixed(1)}% ${s.gdsOk ? "PASS" : "FAIL"}`, bold: true, color: s.gdsOk ? GREEN : RED },
    ],
    [
      { t: "TDS Ratio", bold: true },
      { t: `${s.tds.toFixed(1)}% ${s.tdsOk ? "PASS" : "FAIL"}`, bold: true, color: s.tdsOk ? GREEN : RED },
    ],
  ]);

  const tips: string[] = [];
  if (!s.gdsOk)
    tips.push(
      `GDS too high: Your gross debt service ratio exceeds ${settings.gdsLimit}%. Consider a larger down payment, lower purchase price, or higher household income.`,
    );
  if (!s.tdsOk)
    tips.push(
      `TDS too high: Your total debt service ratio exceeds ${settings.tdsLimit}%. Pay down existing debts or increase your income to improve qualification.`,
    );
  if (s.gdsOk && s.tdsOk)
    tips.push(
      "Looking good! Your GDS and TDS ratios are within standard lending limits. Consider getting pre-approved to lock in your rate.",
    );
  tips.push(
    "Closing Costs: Budget an additional 1.5-4% of the purchase price for closing costs including land transfer tax, legal fees, and inspections.",
  );
  p = pdfTips(p, "Purchase Tips", tips);

  return finishReport(p, "PurchaseCost");
}
