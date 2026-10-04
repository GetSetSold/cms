/**
 * Affordability PDF report builder.
 * Ported 1:1 in STRUCTURE from the legacy window.pdfAfford builder:
 * same sections, tables, scenario boxes and tips logic — reading from a
 * typed state object instead of the DOM.
 *
 * Note: the legacy builder could embed the listing photo via an async image
 * loader; the shared report engine has no image support, so the report uses
 * the legacy's text-only subject-property branch.
 */
import {
  makeReport,
  pdfTitle,
  pdfHighlight,
  pdfTable,
  pdfRow,
  pdfTips,
  pdfHeading,
  pdfGap,
  pdfSubtext,
  finishReport,
  SP,
  type ReportCtx,
  type PdfCell,
} from "@/lib/calculators/report";
import {
  fmtCAD,
  fmtCADmo,
  minDownPayment,
  cmhcPremium,
  monthlyPI,
  ontarioLTT,
  termLabel,
} from "@/lib/calculators/math";
import type {
  BuiltPdf,
  CalculatorSettings,
  RateType,
  ReportInput,
} from "@/lib/calculators/types";

export interface AffordabilityListing {
  mlsNumber: string;
  price: number;
  address: string;
  city: string;
  beds: string;
  baths: string;
  sqft: string;
  propertyType: string;
  photo: string;
}

/** Everything the report needs — computed once in the component (single source of truth). */
export interface AffordabilityReportState {
  // inputs
  income: number;
  downPayment: number;
  rateType: RateType;
  rate: number;
  term: number;
  amort: number;
  debts: number;
  taxAnnual: number;
  heat: number;
  condo: number;
  askingPrice: number;
  address: string;
  listing: AffordabilityListing | null;
  // results
  maxPrice: number;
  maxMonthlyPI: number;
  affordScore: number;
  scoreLabel: string;
  gds: number;
  tds: number;
  cmhc: number;
  monthlyPI: number;
  monthlyTax: number;
  monthlyHeat: number;
  totalMonthly: number;
  tips: { title: string; detail: string }[];
}

const RED: [number, number, number] = [220, 38, 38];
const GREEN: [number, number, number] = [5, 150, 105];
const BLUE: [number, number, number] = [3, 105, 154];
const GRAY: [number, number, number] = [156, 163, 175];

function fmtAddr(addr: string, max: number): string {
  return addr.length > max ? addr.substring(0, max - 3) + "..." : addr;
}

export function buildAffordabilityPdf(input: ReportInput<AffordabilityReportState>): BuiltPdf {
  const { state: s, settings, reportDate } = input;
  let p: ReportCtx = makeReport("Affordability", reportDate);
  p = pdfTitle(p, "Mortgage Affordability Report");

  // ── Determine prices: listing (locked from MLS) vs asking (manual) ──
  const listingPrice = s.listing && s.listing.price > 0 ? s.listing.price : 0;
  const askPrice = s.askingPrice;
  const ld = s.listing;
  const addr = s.address || (ld ? [ld.address, ld.city].filter(Boolean).join(", ") : "");
  const hasList = listingPrice > 0;
  const showAskCol = !hasList || (hasList && askPrice !== listingPrice);
  const hasAnyPrice = hasList || askPrice > 0;

  // ── Subject Property (text-only branch — engine has no image support) ──
  const mlsNum = ld?.mlsNumber ?? "";
  if (hasList) {
    p = pdfHeading(p, "Subject Property");
    p = pdfRow(p, "Property Address", addr || "Not specified");
    p = pdfRow(p, "Listing Price", fmtCAD(listingPrice));
    if (ld?.beds) p = pdfRow(p, "Bedrooms", String(ld.beds));
    if (ld?.baths) p = pdfRow(p, "Bathrooms", String(ld.baths));
    if (ld?.sqft) p = pdfRow(p, "Square Footage", `${ld.sqft} sqft`);
    if (mlsNum) p = pdfRow(p, "Listing ID", mlsNum);
  } else if (askPrice > 0) {
    p = pdfHeading(p, "Property Details");
    p = pdfRow(p, "Asking Price", fmtCAD(askPrice));
  }

  // ── Comparison calculations (same as the on-page comparison) ──
  const maxAfford = s.maxPrice;
  const rate = s.rate;
  const dn = s.downPayment;

  let spPrice = "N/A", spDown = "N/A", spMort = "N/A", spPi = "N/A", spLtt = "N/A";
  let spGap: number | null = null;
  if (hasList) {
    const downL = Math.max(minDownPayment(listingPrice, settings), Math.min(dn, listingPrice));
    const loanL = listingPrice - downL;
    const cmL = cmhcPremium(loanL, listingPrice, settings);
    const tmL = loanL + cmL;
    spPrice = fmtCAD(listingPrice);
    spDown = fmtCAD(downL);
    spMort = fmtCAD(tmL);
    spPi = fmtCADmo(monthlyPI(tmL, rate, s.amort));
    spLtt = fmtCAD(ontarioLTT(listingPrice));
    spGap = maxAfford - listingPrice;
  }

  let apPrice = "N/A", apDown = "N/A", apMort = "N/A", apPi = "N/A", apLtt = "N/A";
  let apGap: number | null = null;
  if (showAskCol && askPrice > 0) {
    const downA = Math.max(minDownPayment(askPrice, settings), Math.min(dn, askPrice));
    const loanA = askPrice - downA;
    const cmA = cmhcPremium(loanA, askPrice, settings);
    const tmA = loanA + cmA;
    apPrice = fmtCAD(askPrice);
    apDown = fmtCAD(downA);
    apMort = fmtCAD(tmA);
    apPi = fmtCADmo(monthlyPI(tmA, rate, s.amort));
    apLtt = fmtCAD(ontarioLTT(askPrice));
    apGap = maxAfford - askPrice;
  }

  const ad2 = Math.min(dn, maxAfford);
  const al2 = maxAfford - ad2;
  const ca2 = cmhcPremium(al2, maxAfford, settings);
  const tmF2 = al2 + ca2;
  const piF2 = monthlyPI(tmF2, rate, s.amort);

  // ── Scenario statement boxes ──
  if (hasList && spGap !== null) {
    p = pdfGap(p, SP.BLOCK_GAP);
    const lineCount = spGap >= 0 && Math.abs(spGap) >= 100 ? 2 : 1;
    const boxH = SP.CONTAINER_PAD + lineCount * 3.4 + SP.CONTAINER_PAD;
    if (spGap < 0) p.doc.setFillColor([254, 242, 242]);
    else if (Math.abs(spGap) < 100) p.doc.setFillColor([240, 249, 255]);
    else p.doc.setFillColor([236, 253, 245]);
    p.doc.rect(14, p.y - 1, 188, boxH, "F");
    if (spGap < 0) p.doc.setFillColor(RED);
    else if (Math.abs(spGap) < 100) p.doc.setFillColor(BLUE);
    else p.doc.setFillColor(GREEN);
    p.doc.rect(14, p.y - 1, 3, boxH, "F");
    p.doc.setFontSize(8);
    if (spGap < 0) p.doc.setTextColor(RED);
    else if (Math.abs(spGap) < 100) p.doc.setTextColor(BLUE);
    else p.doc.setTextColor(GREEN);
    p.doc.setFont("helvetica", "bold");
    p.doc.text("SUBJECT PROPERTY COMPARISON", 22, p.y + SP.CONTAINER_PAD);
    p.doc.setFontSize(9.5);
    p.doc.setTextColor([50, 50, 50]);
    p.doc.setFont("helvetica", "normal");
    const shortAddr = fmtAddr(addr, 45);
    const priceStr = fmtCAD(listingPrice);
    if (spGap < 0) {
      p.doc.text(
        `${shortAddr} at ${priceStr} would be ${spPi} - you need ${fmtCAD(Math.abs(spGap))} more to afford it.`,
        22, p.y + SP.CONTAINER_PAD + 3.4,
      );
      p.doc.text(`Your maximum affordable price is ${fmtCAD(maxAfford)}.`, 22, p.y + SP.CONTAINER_PAD + 6.8);
    } else if (Math.abs(spGap) < 100) {
      p.doc.text(
        `${shortAddr} at ${priceStr} is a perfect match - ${spPi} within your affordable budget.`,
        22, p.y + SP.CONTAINER_PAD + 3.4,
      );
    } else {
      p.doc.text(
        `${shortAddr} at ${priceStr} is ${spPi} - well within your budget.`,
        22, p.y + SP.CONTAINER_PAD + 3.4,
      );
      p.doc.text(
        `You have ${fmtCAD(spGap)} extra capacity above the listing price.`,
        22, p.y + SP.CONTAINER_PAD + 6.8,
      );
    }
    p.y += boxH;
  }

  if (showAskCol && apGap !== null) {
    p = pdfGap(p, SP.BLOCK_GAP);
    const lineCount = apGap >= 0 && Math.abs(apGap) >= 100 ? 2 : 1;
    const boxH = SP.CONTAINER_PAD + lineCount * 3.4 + SP.CONTAINER_PAD;
    if (apGap < 0) p.doc.setFillColor([254, 242, 242]);
    else if (Math.abs(apGap) < 100) p.doc.setFillColor([240, 249, 255]);
    else p.doc.setFillColor([236, 253, 245]);
    p.doc.rect(14, p.y - 1, 188, boxH, "F");
    if (apGap < 0) p.doc.setFillColor(RED);
    else if (Math.abs(apGap) < 100) p.doc.setFillColor(BLUE);
    else p.doc.setFillColor(GREEN);
    p.doc.rect(14, p.y - 1, 3, boxH, "F");
    p.doc.setFontSize(8);
    if (apGap < 0) p.doc.setTextColor(RED);
    else if (Math.abs(apGap) < 100) p.doc.setTextColor(BLUE);
    else p.doc.setTextColor(GREEN);
    p.doc.setFont("helvetica", "bold");
    p.doc.text("ASKING PRICE COMPARISON", 22, p.y + SP.CONTAINER_PAD);
    p.doc.setFontSize(9.5);
    p.doc.setTextColor([50, 50, 50]);
    p.doc.setFont("helvetica", "normal");
    const askStr = fmtCAD(askPrice);
    if (apGap < 0) {
      p.doc.text(
        `You need ${fmtCAD(Math.abs(apGap))} more to afford the asking price of ${askStr}.`,
        22, p.y + SP.CONTAINER_PAD + 3.4,
      );
      p.doc.text(
        `Your monthly payment would be ${apPi}. Maximum affordable: ${fmtCAD(maxAfford)}.`,
        22, p.y + SP.CONTAINER_PAD + 6.8,
      );
    } else if (Math.abs(apGap) < 100) {
      p.doc.text(
        `The asking price of ${askStr} is a perfect match - monthly payment: ${apPi}.`,
        22, p.y + SP.CONTAINER_PAD + 3.4,
      );
    } else {
      p.doc.text(
        `The asking price of ${askStr} is within your budget! Monthly: ${apPi}.`,
        22, p.y + SP.CONTAINER_PAD + 3.4,
      );
      p.doc.text(
        `You have ${fmtCAD(apGap)} extra capacity above the asking price.`,
        22, p.y + SP.CONTAINER_PAD + 6.8,
      );
    }
    p.y += boxH;
  }

  // ── Detailed comparison table ──
  if (hasAnyPrice) {
    p = pdfHeading(p, "Detailed Comparison");
    const diffCell = (gap: number | null, suffix: string): PdfCell => {
      if (gap === null) return { t: "N/A", color: GRAY };
      const over = gap < 0;
      return {
        t: over ? `${fmtCAD(Math.abs(gap))} more${suffix}` : `${fmtCAD(gap)} under${suffix}`,
        color: over ? RED : GREEN,
        bold: true,
      };
    };
    if (hasList && showAskCol) {
      p = pdfTable(p, ["Metric", "Subject Property", "Asking Price", "You Can Afford"], [
        [{ t: "Price", bold: true }, { t: spPrice }, { t: apPrice }, { t: fmtCAD(maxAfford) }],
        [{ t: "Down Payment", bold: true }, { t: spDown }, { t: apDown }, { t: fmtCAD(ad2) }],
        [{ t: "Mortgage Amount", bold: true }, { t: spMort }, { t: apMort }, { t: fmtCAD(tmF2) }],
        [{ t: "Monthly Payment", bold: true }, { t: spPi }, { t: apPi }, { t: fmtCADmo(piF2) }],
        [{ t: "Land Transfer Tax", bold: true }, { t: spLtt }, { t: apLtt }, { t: fmtCAD(ontarioLTT(maxAfford)) }],
        [{ t: "Difference", bold: true }, diffCell(spGap, ""), diffCell(apGap, ""), { t: "" }],
      ]);
    } else if (hasList) {
      p = pdfTable(p, ["Metric", "Subject Property", "You Can Afford"], [
        [{ t: "Price", bold: true }, { t: spPrice }, { t: fmtCAD(maxAfford) }],
        [{ t: "Down Payment", bold: true }, { t: spDown }, { t: fmtCAD(ad2) }],
        [{ t: "Mortgage Amount", bold: true }, { t: spMort }, { t: fmtCAD(tmF2) }],
        [{ t: "Monthly Payment", bold: true }, { t: spPi }, { t: fmtCADmo(piF2) }],
        [{ t: "Land Transfer Tax", bold: true }, { t: spLtt }, { t: fmtCAD(ontarioLTT(maxAfford)) }],
        [{ t: "Difference", bold: true }, diffCell(spGap, " budget"), { t: "" }],
      ]);
    } else {
      p = pdfTable(p, ["Metric", "Asking Price", "You Can Afford"], [
        [{ t: "Price", bold: true }, { t: apPrice }, { t: fmtCAD(maxAfford) }],
        [{ t: "Down Payment", bold: true }, { t: apDown }, { t: fmtCAD(ad2) }],
        [{ t: "Mortgage Amount", bold: true }, { t: apMort }, { t: fmtCAD(tmF2) }],
        [{ t: "Monthly Payment", bold: true }, { t: apPi }, { t: fmtCADmo(piF2) }],
        [{ t: "Land Transfer Tax", bold: true }, { t: apLtt }, { t: fmtCAD(ontarioLTT(maxAfford)) }],
        [{ t: "Difference", bold: true }, diffCell(apGap, " budget"), { t: "" }],
      ]);
    }
  }

  // ── Affordability summary ──
  p = pdfGap(p, SP.BLOCK_GAP);
  p = pdfHighlight(p, "Maximum Affordable Price", fmtCAD(s.maxPrice), fmtCADmo(s.maxMonthlyPI));
  const rtLabel = s.rateType === "fixed" ? "Fixed" : "Variable";
  p = pdfSubtext(
    p,
    `Rate: ${rtLabel} at ${s.rate.toFixed(2)}% | Term: ${termLabel(s.term)} | Amortization: ${s.amort} years`,
    9, [100, 100, 100],
  );
  p = pdfHeading(p, "Affordability Summary");
  const gdsPass = s.gds <= settings.gdsLimit;
  const tdsPass = s.tds <= settings.tdsLimit;
  p = pdfTable(p, ["Metric", "Value", "Status"], [
    [{ t: "Afford Score", bold: true }, `${s.affordScore} ${s.scoreLabel}`,
      { t: s.affordScore >= 40 ? "Good" : "Needs Work", color: s.affordScore >= 40 ? GREEN : RED, bold: true }],
    [{ t: "GDS Ratio", bold: true }, `${s.gds.toFixed(1)}%`,
      { t: gdsPass ? "PASS" : "FAIL", color: gdsPass ? GREEN : RED, bold: true }],
    [{ t: "TDS Ratio", bold: true }, `${s.tds.toFixed(1)}%`,
      { t: tdsPass ? "PASS" : "FAIL", color: tdsPass ? GREEN : RED, bold: true }],
    [{ t: "CMHC Insurance", bold: true }, s.cmhc > 0 ? fmtCAD(s.cmhc) : "Waived"],
    [{ t: "Monthly P&I", bold: true }, fmtCADmo(s.monthlyPI)],
    [{ t: "Property Tax", bold: true }, fmtCADmo(s.monthlyTax)],
    [{ t: "Heating", bold: true }, fmtCADmo(s.monthlyHeat)],
    [{ t: "Total Monthly Housing", bold: true }, fmtCADmo(s.totalMonthly)],
  ]);

  // ── Your financial details ──
  p = pdfHeading(p, "Your Financial Details");
  p = pdfTable(p, ["Item", "Value"], [
    [{ t: "Annual Household Income", bold: true }, s.income > 0 ? fmtCAD(s.income) : "Not specified"],
    [{ t: "Monthly Gross Income", bold: true }, s.income > 0 ? fmtCADmo(s.income / 12) : "N/A"],
    [{ t: "Down Payment Available", bold: true }, s.downPayment > 0 ? fmtCAD(s.downPayment) : "Not specified"],
    [{ t: "Interest Rate", bold: true }, `${s.rate.toFixed(2)}% (${rtLabel})`],
    [{ t: "Mortgage Term", bold: true }, termLabel(s.term)],
    [{ t: "Amortization Period", bold: true }, `${s.amort} years`],
    [{ t: "Monthly Debts / Obligations", bold: true }, s.debts > 0 ? fmtCADmo(s.debts) : "$0/mo"],
  ]);

  // ── Coach tips ──
  p = pdfTips(
    p,
    "Affordability Coach Tips",
    s.tips.map((t) => `${t.title}: ${t.detail}`),
  );

  return finishReport(p, "Affordability");
}
