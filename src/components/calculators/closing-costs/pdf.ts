/**
 * Closing Costs — PDF report builder.
 * Ported 1:1 from the legacy window.pdfClosing (no DOM reads).
 */
import {
  makeReport,
  pdfTitle,
  pdfHighlight,
  pdfTable,
  pdfTips,
  finishReport,
  type PdfCell,
} from "@/lib/calculators/report";
import type { ReportInput, BuiltPdf } from "@/lib/calculators/types";
import { fmtCAD } from "@/lib/calculators/math";

export interface ClosingCostItem {
  name: string;
  amount: number;
}

export interface ClosingCostsReportState {
  price: number;
  down: number;
  ftb: boolean;
  toronto: boolean;
  ltt: number;
  toLtt: number;
  rebates: number;
  cmhc: number;
  /** Ancillary items, on + amount > 0 only. */
  ancillary: ClosingCostItem[];
  total: number;
  cashNeeded: number;
}

export function buildClosingCostsPdf({
  state,
  reportDate,
}: ReportInput<ClosingCostsReportState>): BuiltPdf {
  let p = makeReport("Closing", reportDate);
  p = pdfTitle(p, "Closing Costs Report");

  p = pdfHighlight(
    p,
    "Total Closing Costs",
    fmtCAD(state.total),
    `Total cash needed: ${fmtCAD(state.cashNeeded)} (down payment + closing costs)`,
  );

  const rows: PdfCell[][] = [
    [{ t: "Ontario Land Transfer Tax", bold: true }, fmtCAD(state.ltt)],
    [{ t: "Toronto LTT (MBTT)", bold: true }, state.toLtt > 0 ? fmtCAD(state.toLtt) : "N/A"],
    [
      { t: "First-Time Buyer Rebate", bold: true },
      state.ftb ? `-${fmtCAD(state.rebates)}` : "N/A",
    ],
    [{ t: "CMHC Mortgage Insurance", bold: true }, state.cmhc > 0 ? fmtCAD(state.cmhc) : "Waived"],
  ];
  for (const item of state.ancillary) {
    rows.push([{ t: item.name, bold: true }, fmtCAD(item.amount)]);
  }

  p = pdfTable(p, ["Item", "Estimated Cost"], rows);

  const tips: string[] = [
    "Total Cash Needed: You need your down payment PLUS closing costs on closing day. The total is typically 7-10% of the purchase price.",
  ];
  if (state.ftb) {
    tips.push(
      "First-Time Rebates: As a first-time buyer, you qualify for land transfer tax rebates which are included in this estimate.",
    );
  }
  tips.push(
    "Legal Fees: Shop around for a real estate lawyer. Fees typically range from $1,500-$2,500 depending on complexity.",
    "Title Insurance: Title insurance protects against title disputes, forgery, fraud, and unpaid liens. Typical cost is $350-$400.",
    "Moving Costs: Budget an additional $350-$5,000 for moving depending on distance and home size.",
    "Home Inspection: A professional inspection costs $200-$500 but can save thousands by uncovering hidden issues.",
    "Budget Buffer: Always set aside an extra 1-2% of the purchase price as a buffer for unexpected closing costs.",
  );

  p = pdfTips(p, "Closing Costs Tips", tips);

  return finishReport(p, "Closing");
}
