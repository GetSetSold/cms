/**
 * Net Proceeds — report state, computation, and PDF builder.
 * Ported 1:1 from the legacy calcNetProceeds / window.pdfNetProceeds,
 * including the default ancillary selling-cost items.
 */
import { fmtCAD } from "@/lib/calculators/math";
import {
  finishReport,
  makeReport,
  pdfHighlight,
  pdfTable,
  pdfTips,
  pdfTitle,
} from "@/lib/calculators/report";
import type { BuiltPdf, ReportInput } from "@/lib/calculators/types";

export interface AncillaryItem {
  id: string;
  name: string;
  desc: string;
  amount: number;
  on: boolean;
  removable: boolean;
}

export const DEFAULT_ANCILLARY_ITEMS: AncillaryItem[] = [
  {
    id: "np_legal",
    name: "Legal Fees (Seller)",
    desc: "Your real estate lawyer handles the discharge of mortgage, preparation of closing documents, title transfer and statement of adjustments. Typically $800 - $2,500 for a standard residential sale.",
    amount: 1800,
    on: true,
    removable: false,
  },
  {
    id: "np_discharge",
    name: "Mortgage Discharge Fee",
    desc: "The fee charged by your lender to discharge (release) the mortgage from the property title. Usually $250 - $400. Some lenders include this in the mortgage penalty.",
    amount: 350,
    on: true,
    removable: false,
  },
  {
    id: "np_moving",
    name: "Moving Expenses",
    desc: "The cost of hiring movers to transport your belongings. Depending on home size and distance, expect $350 - $5,000+. Local moves for a 3-bedroom home typically run $1,000 - $2,500.",
    amount: 2000,
    on: true,
    removable: false,
  },
  {
    id: "np_staging",
    name: "Home Staging",
    desc: "Professional staging to make your home more appealing to buyers. Costs range from $500 for a consultation to $3,000+ for full-home staging with furniture rental.",
    amount: 0,
    on: false,
    removable: false,
  },
  {
    id: "np_repairs",
    name: "Pre-Sale Repairs & Touch-Ups",
    desc: "Minor repairs, painting, landscaping or cleaning to prepare the home for listing and buyer showings. Budget $500 - $5,000 depending on condition.",
    amount: 0,
    on: false,
    removable: false,
  },
  {
    id: "np_cleaning",
    name: "Cleaning Costs",
    desc: "Professional cleaning before listing photos, after moving out, or for buyer final walk-through. Typically $200 - $600 for a standard home.",
    amount: 300,
    on: false,
    removable: false,
  },
  {
    id: "np_appraisal",
    name: "Seller Appraisal",
    desc: "Some sellers get a pre-listing appraisal to set a competitive asking price. Around $350 - $500. Often not required if relying on a CMA.",
    amount: 0,
    on: false,
    removable: false,
  },
  {
    id: "np_spousal",
    name: "Spousal Buyout / Equalization",
    desc: "If selling as part of a separation or divorce, legal and valuation costs for property equalization. Amounts vary widely. Consult your family lawyer.",
    amount: 0,
    on: false,
    removable: false,
  },
];

export interface NetProceedsInputs {
  salePrice: number;
  mortgage: number;
  penalty: number;
  commRate: number;
  items: AncillaryItem[];
}

export interface NetProceedsReportState extends NetProceedsInputs {
  commission: number;
  hstOnComm: number;
  ancTotal: number;
  totalDeductions: number;
  netProceeds: number;
  pct: number;
}

export function computeNetProceeds(inp: NetProceedsInputs): NetProceedsReportState {
  const commRate = Math.max(0, Math.min(20, inp.commRate));
  const commission = (inp.salePrice * commRate) / 100;
  const hstOnComm = commission * 0.13;
  let ancTotal = 0;
  inp.items.forEach((item) => {
    if (item.on && item.amount > 0) ancTotal += item.amount;
  });
  const totalDeductions = inp.mortgage + inp.penalty + commission + hstOnComm + ancTotal;
  const netProceeds = inp.salePrice - totalDeductions;
  const pct = inp.salePrice > 0 ? (netProceeds / inp.salePrice) * 100 : 0;
  return { ...inp, commRate, commission, hstOnComm, ancTotal, totalDeductions, netProceeds, pct };
}

export function buildNetProceedsPdf({
  state,
  reportDate,
}: ReportInput<NetProceedsReportState>): BuiltPdf {
  let p = makeReport("NetProceeds", reportDate);
  p = pdfTitle(p, "Net Proceeds Report");
  const pctText = state.salePrice > 0 ? ((state.netProceeds / state.salePrice) * 100).toFixed(1) : "0.0";
  p = pdfHighlight(
    p,
    "Estimated Net Proceeds",
    fmtCAD(state.netProceeds),
    `You keep ${pctText}% of the ${fmtCAD(state.salePrice)} sale price`,
  );
  const rows: ({ t: string; bold?: boolean; color?: [number, number, number] } | string)[][] = [
    [{ t: "Sale Price", bold: true, color: [5, 150, 105] }, "+" + fmtCAD(state.salePrice)],
    [{ t: "Outstanding Mortgage Balance", bold: true }, "-" + fmtCAD(state.mortgage)],
    [{ t: "Mortgage Penalty", bold: true }, state.penalty > 0 ? "-" + fmtCAD(state.penalty) : "N/A"],
    [{ t: `Realtor Commission (${state.commRate}%)`, bold: true }, "-" + fmtCAD(state.commission)],
    [{ t: "HST on Commission (13%)", bold: true }, "-" + fmtCAD(state.hstOnComm)],
  ];
  state.items.forEach((item) => {
    if (item.on && item.amount > 0) rows.push([{ t: item.name, bold: true }, "-" + fmtCAD(item.amount)]);
  });
  rows.push([{ t: "NET PROCEEDS", bold: true, color: [1, 58, 81] }, fmtCAD(state.netProceeds)]);
  p = pdfTable(p, ["Deduction", "Amount"], rows);
  p = pdfTips(p, "Net Proceeds Tips", [
    "Commission: In Ontario, the typical commission is 5% split between listing and buyer agents. Negotiate this rate before signing.",
    "Mortgage Penalty: Contact your lender for the exact penalty. IRD penalties on fixed-rate mortgages can be significant.",
    "Legal Fees: Budget $800-$2,500 for your lawyer to handle closing, discharge the mortgage and transfer title.",
    "Discharge Fee: Your lender charges $250-$400 to release the mortgage from title. Confirm with your lender.",
    "Moving Costs: Get at least 3 quotes from moving companies. Book early, especially in summer months.",
    "Staging: Professional staging costs $500-$3,000+ but can increase sale price by 1-5%.",
  ]);
  return finishReport(p, "NetProceeds");
}
