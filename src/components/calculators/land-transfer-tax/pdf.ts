/**
 * Ontario Land Transfer Tax — PDF report builder.
 * Ported 1:1 from the legacy window.pdfLTT (no DOM reads).
 */
import {
  makeReport,
  pdfTitle,
  pdfHighlight,
  pdfTable,
  pdfHeading,
  pdfTips,
  finishReport,
} from "@/lib/calculators/report";
import type { ReportInput, BuiltPdf } from "@/lib/calculators/types";
import { fmtCAD } from "@/lib/calculators/math";

export interface LandTransferTaxReportState {
  price: number;
  ftb: boolean;
  toronto: boolean;
  onLtt: number;
  toLtt: number;
  rebate: number;
  total: number;
}

export function buildLandTransferTaxPdf({
  state,
  settings,
  reportDate,
}: ReportInput<LandTransferTaxReportState>): BuiltPdf {
  let p = makeReport("LTT", reportDate);
  p = pdfTitle(p, "Land Transfer Tax Report");

  const rebateText = state.ftb
    ? `Rebates applied: Ontario ${fmtCAD(settings.onRebate)}${
        state.toronto ? ` + Toronto ${fmtCAD(settings.toRebate)}` : ""
      }`
    : "No rebates applied";

  p = pdfHighlight(p, "Total Land Transfer Tax", fmtCAD(state.total), rebateText);

  p = pdfTable(
    p,
    ["Component", "Amount"],
    [
      [{ t: "Ontario LTT", bold: true }, fmtCAD(state.onLtt)],
      [{ t: "Toronto LTT (MBTT)", bold: true }, fmtCAD(state.toLtt)],
      [
        { t: "Rebates Applied", bold: true },
        state.ftb ? `-${fmtCAD(state.rebate)} (applied)` : "$0",
      ],
    ],
  );

  p = pdfHeading(p, "Ontario LTT Rates");
  p = pdfTable(
    p,
    ["Price Range", "Rate"],
    [
      ["First $55,000", "0.5%"],
      ["$55,001 - $250,000", "1.0%"],
      ["$250,001 - $400,000", "1.5%"],
      ["$400,001 - $2,000,000", "2.0%"],
      ["Over $2,000,000", "2.5%"],
    ],
  );

  const tips: string[] = [];
  if (state.ftb) {
    tips.push(
      `First-Time Buyer: You qualify for the Ontario Land Transfer Tax refund of up to ${fmtCAD(settings.onRebate)}${
        state.toronto ? ` plus Toronto MBTT rebate of ${fmtCAD(settings.toRebate)}` : ""
      }. This is automatically applied at closing.`,
    );
  } else {
    tips.push(
      "Not a First-Time Buyer? If you or your spouse have not owned a home in the last 4 years, you may still qualify for the first-time buyer rebate.",
    );
  }
  if (state.toronto) {
    tips.push(
      "Toronto Buyers: Toronto charges an additional Municipal Land Transfer Tax (MBTT) on top of the provincial tax. Factor this into your closing budget.",
    );
  }
  tips.push(
    "Budgeting: Land transfer tax is due on closing day. Ensure you have these funds available in addition to your down payment.",
  );

  p = pdfTips(p, "Land Transfer Tax Tips", tips);

  return finishReport(p, "LTT");
}
