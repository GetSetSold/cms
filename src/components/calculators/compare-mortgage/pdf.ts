/**
 * Compare Mortgage Scenarios — PDF report builder.
 * Ported 1:1 from the legacy window.pdfCompare (no DOM reads).
 */
import {
  makeReport,
  pdfTitle,
  pdfSubtext,
  pdfTable,
  pdfTips,
  finishReport,
} from "@/lib/calculators/report";
import type { ReportInput, BuiltPdf, RateType } from "@/lib/calculators/types";
import { fmtCAD, fmtCADmo, termLabel } from "@/lib/calculators/math";

export interface CompareScenarioState {
  name: string;
  rateType: RateType;
  rate: number;
  term: number;
  amort: number;
  pi: number;
  intTerm: number;
  balance: number;
  intFull: number;
  totalCost: number;
}

export interface CompareMortgageReportState {
  price: number;
  down: number;
  scenarios: CompareScenarioState[];
  bestIdx: number;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function buildCompareMortgagePdf({
  state,
  reportDate,
}: ReportInput<CompareMortgageReportState>): BuiltPdf {
  let p = makeReport("Compare", reportDate);
  p = pdfTitle(p, "Mortgage Comparison Report");

  p = pdfSubtext(
    p,
    `Property: ${fmtCAD(state.price)} | Down Payment: ${fmtCAD(state.down)}`,
    10,
    [80, 80, 80],
  );

  const names = state.scenarios.map((s) => s.name);
  p = pdfTable(
    p,
    ["Item", ...names],
    [
      [
        { t: "Rate Type", bold: true },
        ...state.scenarios.map((s) => `${cap(s.rateType)} ${s.rate.toFixed(2)}%`),
      ],
      [{ t: "Term", bold: true }, ...state.scenarios.map((s) => termLabel(s.term))],
      [
        { t: "Monthly P&I", bold: true },
        ...state.scenarios.map((s) => fmtCADmo(s.pi)),
      ],
      [
        { t: "Interest Over Term", bold: true },
        ...state.scenarios.map((s) => fmtCAD(s.intTerm)),
      ],
      [
        { t: "Balance at Renewal", bold: true },
        ...state.scenarios.map((s) => fmtCAD(s.balance)),
      ],
      [
        { t: "Total Interest", bold: true },
        ...state.scenarios.map((s) => fmtCAD(s.intFull)),
      ],
      [
        { t: "Total Cost", bold: true },
        ...state.scenarios.map((s) => fmtCAD(s.totalCost)),
      ],
    ],
  );

  const best = state.scenarios[state.bestIdx];
  p = pdfTips(p, "Comparison Tips", [
    `Best Monthly Payment: ${best.name} offers the lowest monthly payment at ${fmtCADmo(best.pi)}.`,
    "Rate vs Term: A lower rate with a shorter term may give you flexibility to renegotiate sooner, but carries rate risk at renewal.",
    "Fixed vs Variable: Fixed rates provide certainty; variable rates may save money if rates decrease. Discuss both options with your broker.",
    "Prepayment Privileges: Ask about prepayment options for each scenario. The ability to make extra payments can significantly reduce your total cost.",
  ]);

  return finishReport(p, "Compare");
}
