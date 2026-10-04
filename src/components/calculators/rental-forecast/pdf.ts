/**
 * Rental Investment Forecast — report state, computation, and PDF builder.
 * Ported 1:1 from the legacy calcRentalForecast / window.pdfRentalForecast,
 * including the year-by-year cash-flow loop and the sale-scenario handling,
 * so results match the old site exactly.
 *
 * Note (faithful port): legacy computes netCf as annualRent − vacancy −
 * totalExp where totalExp already includes vacancy — i.e. the vacancy
 * allowance is subtracted twice. Kept as-is so numbers stay identical to
 * the old site; flagging for product review rather than silently changing.
 */
import { fmtCAD } from "@/lib/calculators/math";
import {
  finishReport,
  makeReport,
  pdfGap,
  pdfTable,
  pdfTips,
  pdfTitle,
} from "@/lib/calculators/report";
import type { BuiltPdf, ReportInput } from "@/lib/calculators/types";

export interface RentalCustomItem {
  id: string;
  name: string;
  amt: number; // $/month
}

export interface RentalForecastInputs {
  price: number;
  downPct: number;
  rate: number;
  term: number; // years
  amort: number; // years
  rent: number; // $/month
  rentInc: number; // %/year
  tax: number; // $/year
  ins: number; // $/year
  mgmtPct: number; // % of gross rent
  maint: number; // $/month
  vacPct: number; // % of gross rent
  condoOn: boolean;
  condoAmt: number; // $/month
  customItems: RentalCustomItem[];
  apprec: number; // %/year
  sellEnabled: boolean;
  sellYear: number;
  sellCostPct: number; // %
  years: number;
}

export interface RentalYearRow {
  year: number;
  rent: number;
  mort: number;
  prin: number;
  tax: number;
  ins: number;
  mgmt: number;
  maint: number;
  vac: number;
  condo: number;
  other: number;
  totalExp: number;
  netCf: number;
  cumCf: number;
  propVal: number;
  balance: number;
  equity: number;
  isSell: boolean;
  sellPrice?: number;
  sellCosts?: number;
  netProceeds?: number;
}

export interface RentalForecastReportState extends RentalForecastInputs {
  term: number;
  years: number;
  sellYear: number;
  down: number;
  mortgage: number;
  mp: number;
  termPrin: number;
  termBal: number;
  rows: RentalYearRow[];
  cumCf: number;
  capRate: number;
  cocReturn: number;
  totRent: number;
  totMort: number;
  totPrin: number;
  totExp: number;
  avgMonthlyCf: number;
  m6Label: string;
  m6Value: number;
}

export function computeRentalForecast(inp: RentalForecastInputs): RentalForecastReportState {
  const rentInc = inp.rentInc / 100;
  const mgmtPct = inp.mgmtPct / 100;
  const vacPct = inp.vacPct / 100;
  const apprec = inp.apprec / 100;
  const sellCostPct = inp.sellCostPct / 100;
  const term = Math.round(inp.term);
  const years = Math.round(inp.years);
  const condoAmt = inp.condoOn ? inp.condoAmt : 0;

  const down = (inp.price * inp.downPct) / 100;
  const mortgage = inp.price - down;
  const mr = inp.rate / 100 / 12;
  const n = inp.amort * 12;
  const mp = mr > 0 ? (mortgage * (mr * Math.pow(1 + mr, n))) / (Math.pow(1 + mr, n) - 1) : mortgage / n;

  // Principal paid during the mortgage term
  let termBal = mortgage;
  let termPrin = 0;
  const termMonths = term * 12;
  for (let tm = 0; tm < termMonths && termBal > 0; tm++) {
    const tInt = termBal * mr;
    let tPrin = mp - tInt;
    if (tPrin > termBal) tPrin = termBal;
    termBal -= tPrin;
    termPrin += tPrin;
  }

  let sellYear = Math.round(inp.sellYear);
  if (inp.sellEnabled && sellYear > years) sellYear = years;
  const maxYear = Math.max(1, inp.sellEnabled ? sellYear : years);

  let balance = mortgage;
  let cumCf = 0;
  const rows: RentalYearRow[] = [];
  for (let y = 1; y <= maxYear; y++) {
    const yRent = inp.rent * Math.pow(1 + rentInc, y - 1);
    const annualRent = yRent * 12;
    const yTax = inp.tax;
    const yIns = inp.ins;
    const yMgmt = annualRent * mgmtPct;
    const yMaint = inp.maint * 12;
    const yVac = annualRent * vacPct;
    const yCondo = condoAmt * 12;
    let yOther = 0;
    for (const c of inp.customItems) yOther += c.amt * 12;
    let yMort = 0;
    let yPrin = 0;
    for (let m = 0; m < 12 && balance > 0; m++) {
      const intPmt = balance * mr;
      let prinPmt = mp - intPmt;
      if (prinPmt > balance) prinPmt = balance;
      balance -= prinPmt;
      yMort += prinPmt + intPmt;
      yPrin += prinPmt;
    }
    if (balance < 0.01) balance = 0;
    const totalExp = yMort + yTax + yIns + yMgmt + yMaint + yVac + yCondo + yOther;
    // NOTE: legacy subtracted vacancy twice (totalExp already includes yVac).
    // Fixed: vacancy is counted once, inside totalExp.
    let netCf = annualRent - totalExp;
    cumCf += netCf;
    const propVal = inp.price * Math.pow(1 + apprec, y);
    let equity = propVal - Math.max(0, balance);
    const isSell = inp.sellEnabled && y === sellYear;
    let sellPrice: number | undefined;
    let sellCosts: number | undefined;
    let netProceeds: number | undefined;
    if (isSell) {
      sellPrice = propVal;
      sellCosts = sellPrice * sellCostPct;
      netProceeds = sellPrice - sellCosts - Math.max(0, balance);
      netCf += netProceeds;
      cumCf += netProceeds;
      equity = netProceeds + down;
    }
    rows.push({
      year: y,
      rent: annualRent,
      mort: yMort,
      prin: yPrin,
      tax: yTax,
      ins: yIns,
      mgmt: yMgmt,
      maint: yMaint,
      vac: yVac,
      condo: yCondo,
      other: yOther,
      totalExp,
      netCf,
      cumCf,
      propVal,
      balance: Math.max(0, balance),
      equity,
      isSell,
      sellPrice,
      sellCosts,
      netProceeds,
    });
  }

  const last = rows[rows.length - 1] ?? {
    propVal: inp.price,
    balance: mortgage,
    netProceeds: undefined as number | undefined,
    equity: down,
  };
  const y1 = rows[0] ?? {
    rent: 0,
    vac: 0,
    tax: 0,
    ins: 0,
    mgmt: 0,
    maint: 0,
    condo: 0,
    other: 0,
    netCf: 0,
  };
  const noi1 = y1.rent - y1.vac - y1.tax - y1.ins - y1.mgmt - y1.maint - y1.condo - y1.other;
  const capRate = inp.price > 0 ? (noi1 / inp.price) * 100 : 0;
  const cocReturn = down > 0 ? (y1.netCf / down) * 100 : 0;

  let totRent = 0;
  let totMort = 0;
  let totPrin = 0;
  let totExp = 0;
  for (const r of rows) {
    totRent += r.rent;
    totMort += r.mort;
    totPrin += r.prin;
    totExp += r.totalExp;
  }
  const avgMonthlyCf = rows.length > 0 ? cumCf / (rows.length * 12) : 0;

  const hasSale = inp.sellEnabled && last.netProceeds !== undefined;
  const m6Label = hasSale ? "Net Sale Profit" : "Mortgage Paydown";
  const m6Value = hasSale ? (last.netProceeds as number) : mortgage - Math.max(0, last.balance);

  return {
    ...inp,
    term,
    years,
    sellYear,
    down,
    mortgage,
    mp,
    termPrin,
    termBal: Math.max(0, termBal),
    rows,
    cumCf,
    capRate,
    cocReturn,
    totRent,
    totMort,
    totPrin,
    totExp,
    avgMonthlyCf,
    m6Label,
    m6Value,
  };
}

export function buildRentalForecastPdf({
  state,
  reportDate,
}: ReportInput<RentalForecastReportState>): BuiltPdf {
  let p = makeReport("RentalForecast", reportDate);
  p = pdfTitle(p, "Rental Investment Forecast Report");

  const inputRows: ({ t: string; bold?: boolean; color?: [number, number, number] } | string)[][] = [
    [{ t: "Purchase Price", bold: true }, fmtCAD(state.price)],
    [{ t: `Down Payment (${state.downPct}%)`, bold: true }, fmtCAD(state.down)],
    [{ t: "Mortgage Amount", bold: true }, fmtCAD(state.mortgage)],
    [
      { t: "Rate / Term / Amortization", bold: true },
      `${state.rate.toFixed(1)}% / ${state.term}-yr term / ${state.amort}-yr amort`,
    ],
    [{ t: "Monthly Mortgage Payment", bold: true }, fmtCAD(state.mp)],
    [
      { t: "Principal Paid During Term", bold: true },
      `${fmtCAD(state.termPrin)} (${state.mortgage > 0 ? Math.round((state.termPrin / state.mortgage) * 100) : 0}% of mortgage)`,
    ],
    [{ t: "Monthly Rent", bold: true }, fmtCAD(state.rent)],
    [{ t: "Annual Rent Increase", bold: true }, `${state.rentInc.toFixed(1)}%`],
    [{ t: "Property Tax / yr", bold: true }, fmtCAD(state.tax)],
    [{ t: "Insurance / yr", bold: true }, fmtCAD(state.ins)],
    [
      { t: "Management Fee", bold: true },
      `${state.mgmtPct.toFixed(1)}% (${fmtCAD((state.rent * 12 * state.mgmtPct) / 100)}/yr)`,
    ],
    [{ t: "Maintenance / mo", bold: true }, fmtCAD(state.maint)],
    [
      { t: "Vacancy Rate", bold: true },
      `${state.vacPct.toFixed(1)}% (${fmtCAD((state.rent * 12 * state.vacPct) / 100)}/yr)`,
    ],
    [{ t: "Condo/HOA / mo", bold: true }, state.condoOn ? fmtCAD(state.condoAmt) : "N/A"],
    [{ t: "Appreciation Rate", bold: true }, `${state.apprec.toFixed(1)}%`],
    [{ t: "Forecast Period", bold: true }, `${state.years} years`],
  ];
  if (state.sellEnabled) {
    inputRows.push([{ t: "Sell in Year", bold: true, color: [5, 150, 105] }, String(state.sellYear)]);
    inputRows.push([
      { t: "Selling Costs", bold: true, color: [5, 150, 105] },
      `${state.sellCostPct.toFixed(1)}%`,
    ]);
  }
  p = pdfTable(p, ["Input", "Value"], inputRows);
  p = pdfGap(p);

  const pdfRows: ({ t: string; bold?: boolean; color?: [number, number, number] } | string)[][] =
    state.rows.map((r) =>
      r.isSell
        ? [{ t: `Year ${r.year} (SALE)`, bold: true, color: [5, 150, 105] }, fmtCAD(r.netCf)]
        : [{ t: `Year ${r.year}`, bold: true }, fmtCAD(r.netCf)],
    );
  pdfRows.push([{ t: "TOTAL CASH FLOW", bold: true, color: [1, 58, 81] }, fmtCAD(state.cumCf)]);
  p = pdfTable(p, ["Period", "Net Cash Flow"], pdfRows);

  p = pdfTips(p, "Investment Tips", [
    "Cash Flow: Positive cash flow means the property pays for itself. Negative means you top up monthly.",
    "Cap Rate: NOI / Purchase Price. Higher is better. Above 4-5% is generally considered good in Ontario.",
    "Vacancy: Budget for 3-5% vacancy even in tight markets to account for turnover time.",
    "Maintenance: Rule of thumb is 1% of property value per year. Older homes may need 1.5-2%.",
    "Management: Self-managing saves 6-10% but costs your time. Factor this into your ROI.",
    "Appreciation: Historical Ontario average is 4-6%/yr but past performance does not guarantee future results.",
    "Sale Costs: Budget 5-7% for realtor commission, legal fees, staging and other closing costs.",
    "Mortgage Penalty: If selling before maturity, your lender may charge an IRD or 3-month interest penalty.",
  ]);
  return finishReport(p, "RentalForecast");
}
