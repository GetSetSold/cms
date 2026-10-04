/**
 * Ontario HST Rebate — PDF report builder + framework math.
 * Ported 1:1 from the legacy window.pdfHST / calcHSTNewRules / calcHSTOldRules
 * (no DOM reads).
 *
 * IMPORTANT: both rebate frameworks are CONFIGURED ASSUMPTIONS managed in
 * Admin → Calculators — they are planning estimates, not verified law.
 */
import {
  makeReport,
  pdfTitle,
  pdfHighlight,
  pdfSubtext,
  pdfTable,
  pdfHeading,
  pdfTips,
  finishReport,
} from "@/lib/calculators/report";
import type { ReportInput, BuiltPdf } from "@/lib/calculators/types";
import { fmtCAD } from "@/lib/calculators/math";

export type HstRegime = "expanded" | "previous";

export type HstBand = "b1" | "b2" | "b3" | "b4";

export interface HstResult {
  bp: number;
  th: number;
  fr: number;
  orb: number;
  tr: number;
  band: HstBand;
  bandTitle: string;
  bandDesc: string;
}

/** "Expanded 2026 framework" — configured assumption, not verified law. */
export function hstExpandedRules(p: number): HstResult {
  const bp = p / 1.13;
  const th = bp * 0.13;
  let fr: number, orb: number, band: HstBand, bandTitle: string, bandDesc: string;
  if (p <= 1000000) {
    fr = bp * 0.05;
    orb = bp * 0.08;
    band = "b1";
    bandTitle = "Full HST Removal - Homes up to $1,000,000";
    bandDesc =
      "Purchase price at or below $1,000,000. Full 13% HST rebated. Maximum rebate $130,000. All buyers qualify - not limited to first-time buyers.";
  } else if (p <= 1850000) {
    const pct = (1850000 - p) / (1850000 - 1000000);
    const totalRebate = 24000 + pct * (130000 - 24000);
    fr = totalRebate * (5 / 13);
    orb = totalRebate * (8 / 13);
    band = p <= 1500000 ? "b2" : "b3";
    if (p <= 1500000) {
      bandTitle = "Declining Rebate - Homes $1M to $1.5M";
      bandDesc =
        "Rebate declines smoothly from $130,000 at $1M to approximately $97,000 at $1.5M. All buyers qualify.";
    } else {
      bandTitle = "Declining Rebate - Homes $1.5M to $1.85M";
      bandDesc =
        "Rebate continues declining from approximately $97,000 at $1.5M down to $24,000 at $1.85M. All buyers qualify.";
    }
  } else {
    fr = 0;
    orb = 24000;
    band = "b4";
    bandTitle = "Existing Provincial Rebate Only - Homes over $1.85M";
    bandDesc =
      "Purchase price above $1,850,000. No federal rebate. Ontario provincial rebate of $24,000 only. Previous framework rules continue to apply.";
  }
  return { bp, th, fr, orb, tr: fr + orb, band, bandTitle, bandDesc };
}

/** "Previous framework" — configured assumption, not verified law. */
export function hstPreviousRules(p: number): HstResult {
  let bp: number, fr: number, orb: number, band: HstBand, bandTitle: string, bandDesc: string;
  if (p <= 368200) {
    band = "b1";
    bp = p / 1.052;
    fr = bp * 0.05 * 0.36;
    orb = bp * 0.08 * 0.75;
    bandTitle = "Price Band 1 - Full Rebates (Previous Framework)";
    bandDesc =
      "Base price at or below $350,000. Full federal rebate (36% of 5%) up to $6,300 and full Ontario rebate (75% of 8%) up to $24,000. Maximum total rebate approximately $30,300.";
  } else if (p <= 424850) {
    band = "b2";
    bp = (p + 28350) / 1.133;
    fr = Math.max(0, 6300 * ((450000 - bp) / 100000));
    orb = Math.min(bp * 0.08 * 0.75, 24000);
    bandTitle = "Price Band 2 - Federal Rebate Phasing Out (Previous Framework)";
    bandDesc =
      "Base price $350,000 to $400,000. Federal rebate reduces on a sliding scale as price increases. Ontario rebate still 75% of 8%.";
  } else if (p <= 484500) {
    band = "b3";
    bp = (p + 52350) / 1.193;
    fr = Math.max(0, 6300 * ((450000 - bp) / 100000));
    orb = Math.min(bp * 0.08 * 0.75, 24000);
    bandTitle = "Price Band 3 - Federal Rebate Nearly Zero (Previous Framework)";
    bandDesc = "Base price $400,000 to $450,000. Federal rebate near zero. Ontario rebate capped at $24,000.";
  } else {
    band = "b4";
    bp = (p + 24000) / 1.13;
    fr = 0;
    orb = Math.min(bp * 0.08 * 0.75, 24000);
    bandTitle = "Price Band 4 - Ontario Rebate Only (Previous Framework)";
    bandDesc = "Base price above $450,000. No federal rebate. Ontario provincial rebate of 75% of 8%, capped at $24,000.";
  }
  return { bp, th: bp * 0.13, fr, orb, tr: fr + orb, band, bandTitle, bandDesc };
}

export function hstRegimeLabel(r: HstRegime): string {
  return r === "expanded" ? "Expanded 2026 Framework" : "Previous Framework";
}

export interface HstReportState {
  price: number;
  regime: HstRegime;
  result: HstResult;
  other: HstResult;
  netHST: number;
  savings: number;
}

export function buildHstRebatePdf({ state, reportDate }: ReportInput<HstReportState>): BuiltPdf {
  let p = makeReport("HST", reportDate);
  p = pdfTitle(p, "Ontario New Home HST Rebate Report");

  const { price, result } = state;
  const savings = state.savings;

  p = pdfHighlight(p, "Total HST Rebate", fmtCAD(result.tr), hstRegimeLabel(state.regime));
  p = pdfSubtext(p, `Purchase Price (incl. HST): ${fmtCAD(price)}`, 10, [80, 80, 80]);

  p = pdfTable(
    p,
    ["Component", "Amount"],
    [
      [{ t: "Builder's Base Price", bold: true }, fmtCAD(result.bp)],
      [{ t: "Total HST (13%)", bold: true }, fmtCAD(result.th)],
      [{ t: "Federal Rebate (5%)", bold: true }, fmtCAD(result.fr)],
      [{ t: "Ontario Rebate (8%)", bold: true }, fmtCAD(result.orb)],
      [{ t: "HST You Actually Pay", bold: true }, fmtCAD(state.netHST)],
    ],
  );

  p = pdfHeading(p, "Framework Comparison (Configured Assumptions)");
  const newTr = fmtCAD(hstExpandedRules(price).tr);
  const oldTr = fmtCAD(hstPreviousRules(price).tr);
  p = pdfTable(
    p,
    ["Framework", "Rebate"],
    [
      [{ t: "Expanded 2026 Framework (configured assumption)", bold: true }, newTr],
      [{ t: "Previous Framework (configured assumption)", bold: true }, oldTr],
      [
        { t: "Your Extra Savings", bold: true },
        {
          t: (savings >= 0 ? "+" : "") + fmtCAD(savings).replace("$-", "-$"),
          bold: true,
          color: savings > 0 ? [5, 150, 105] : savings < 0 ? [220, 38, 38] : [100, 100, 100],
        },
      ],
    ],
  );

  p = pdfHeading(p, "Rebate Tiers - Expanded 2026 Framework (Configured Assumption)");
  p = pdfTable(
    p,
    ["Price Range", "Maximum Rebate"],
    [
      ["Up to $1,000,000", "Full 13% (Max $130,000)"],
      ["$1,000,001 - $1,500,000", "$130,000 to ~$97,000 (declining)"],
      ["$1,500,001 - $1,850,000", "~$97,000 to $24,000 (declining)"],
      ["Over $1,850,000", "$24,000 (base Ontario rebate only)"],
    ],
  );

  p = pdfTips(p, "HST Rebate Tips", [
    "All Buyers Qualify: Under the Expanded 2026 framework (configured assumption), the rebate is available to all eligible buyers regardless of ownership history - both first-time and repeat buyers.",
    "Builder Assignment: The rebate can be assigned directly to your builder at closing, reducing your upfront cost without waiting for a refund.",
    "Program Window (configured assumption): Purchase agreements signed between April 1, 2026 and March 31, 2027. Construction must begin by December 31, 2028.",
    "Substantial Renovations: Homes created through substantial renovations are treated as new housing and may qualify for the rebate.",
    "Assumptions: Rebate figures are calculated from configured framework assumptions managed in Admin -> Calculators. They are planning estimates only - verify eligibility with your builder and a tax professional.",
  ]);

  return finishReport(p, "HST");
}
