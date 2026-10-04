/**
 * Buy vs Rent — report state, computation, and PDF builder.
 * Ported 1:1 from the legacy calcBuyVsRent / window.pdfBuyVsRent, including
 * the year-by-year break-even loop, so results match the old site exactly.
 */
import { cmhcPremium, fmtCAD, fmtCADmo, monthlyPI } from "@/lib/calculators/math";
import {
  finishReport,
  makeReport,
  pdfHighlight,
  pdfSubtext,
  pdfTable,
  pdfTips,
  pdfTitle,
} from "@/lib/calculators/report";
import type { BuiltPdf, CalculatorSettings, ReportInput } from "@/lib/calculators/types";

export interface BuyVsRentInputs {
  price: number;
  downPct: number;
  rate: number;
  amort: number;
  rent: number;
  rentInc: number; // % per year, e.g. 2
  propTax: number; // $/year
  insurance: number; // $/year
  maint: number; // $/year
  apprec: number; // % per year, e.g. 3.5
  investReturn: number; // % per year, e.g. 6
  years: number;
}

export interface BuyVsRentYearRow {
  year: number;
  netBuy: number;
  netRent: number;
}

export interface BuyVsRentReportState extends BuyVsRentInputs {
  downAmt: number;
  cmhc: number;
  mortAmt: number;
  monthlyMortgage: number;
  totalMonthly: number;
  homeValue: number;
  balance: number;
  equity: number;
  totalPaidBuying: number;
  netBuy: number;
  totalRent: number;
  totalInvestValue: number;
  netRent: number;
  buyingBetter: boolean;
  difference: number;
  beYear: number | null;
  currentRent: number;
  yearly: BuyVsRentYearRow[];
}

/** Remaining mortgage balance after `yearsPaid` — legacy closed-form. */
function mortgageBalance(mortAmt: number, rate: number, amort: number, yearsPaid: number): number {
  const mr = rate / 100 / 12;
  const totalMonths = amort * 12;
  const paidMonths = yearsPaid * 12;
  if (paidMonths >= totalMonths) return 0;
  if (mr === 0) return mortAmt - (mortAmt * paidMonths) / totalMonths;
  return (
    (mortAmt * (Math.pow(1 + mr, totalMonths) - Math.pow(1 + mr, paidMonths))) /
    (Math.pow(1 + mr, totalMonths) - 1)
  );
}

export function computeBuyVsRent(
  inp: BuyVsRentInputs,
  settings: CalculatorSettings,
): BuyVsRentReportState {
  const appreciation = inp.apprec / 100;
  const rentIncrease = inp.rentInc / 100;
  const investReturn = inp.investReturn / 100;

  // ── Buying ──
  const downAmt = (inp.price * inp.downPct) / 100;
  const loan = inp.price - downAmt;
  const cmhc = cmhcPremium(loan, inp.price, settings);
  const mortAmt = loan + cmhc;
  const monthlyMortgage = monthlyPI(mortAmt, inp.rate, inp.amort);
  const monthlyPropTax = inp.propTax / 12;
  const monthlyIns = inp.insurance / 12;
  const monthlyMaint = inp.maint / 12;
  const totalMonthly = monthlyMortgage + monthlyPropTax + monthlyIns + monthlyMaint;
  const totalPaidBuying = totalMonthly * inp.years * 12 + downAmt;
  const homeValue = inp.price * Math.pow(1 + appreciation, inp.years);
  const balance = mortgageBalance(mortAmt, inp.rate, inp.amort, inp.years);
  const equity = homeValue - balance;
  const netBuy = equity - totalPaidBuying;

  // ── Renting ──
  let totalRent = 0;
  for (let y = 0; y < inp.years; y++) totalRent += inp.rent * Math.pow(1 + rentIncrease, y) * 12;
  const avgMonthlySavings = Math.max(0, totalMonthly - inp.rent);
  const monthlyInvestRate = investReturn / 12;
  const paidMonths = inp.years * 12;
  const investedSavings =
    monthlyInvestRate > 0 && paidMonths > 0
      ? (avgMonthlySavings * (Math.pow(1 + monthlyInvestRate, paidMonths) - 1)) / monthlyInvestRate
      : avgMonthlySavings * paidMonths;
  const investedDP = downAmt * Math.pow(1 + investReturn, inp.years);
  const totalInvestValue = investedDP + investedSavings;
  const netRent = totalInvestValue - totalRent;

  const buyingBetter = netBuy > netRent;
  const difference = Math.abs(netBuy - netRent);

  // ── Break-even: first year buying's net position meets/exceeds renting's ──
  let beYear: number | null = null;
  const yearly: BuyVsRentYearRow[] = [];
  for (let yr = 1; yr <= inp.amort; yr++) {
    const beDown = downAmt;
    const beMonthly = monthlyPI(mortAmt, inp.rate, inp.amort);
    const beTotalMonthly = beMonthly + monthlyPropTax + monthlyIns + monthlyMaint;
    const bePaidBuying = beTotalMonthly * yr * 12 + beDown;
    const beHomeVal = inp.price * Math.pow(1 + appreciation, yr);
    const beBal = mortgageBalance(mortAmt, inp.rate, inp.amort, yr);
    const beEquity = beHomeVal - beBal;
    const beNetBuy = beEquity - bePaidBuying;
    let beTotalRent = 0;
    for (let ry = 0; ry < yr; ry++) beTotalRent += inp.rent * Math.pow(1 + rentIncrease, ry) * 12;
    const beAvgSave = Math.max(0, beTotalMonthly - inp.rent);
    const bePaidM = yr * 12;
    const beInvSave =
      monthlyInvestRate > 0 && bePaidM > 0
        ? (beAvgSave * (Math.pow(1 + monthlyInvestRate, bePaidM) - 1)) / monthlyInvestRate
        : beAvgSave * bePaidM;
    const beInvDP = beDown * Math.pow(1 + investReturn, yr);
    const beNetRent = beInvDP + beInvSave - beTotalRent;
    if (beNetBuy >= beNetRent && beYear === null) beYear = yr;
    yearly.push({ year: yr, netBuy: beNetBuy, netRent: beNetRent });
  }

  const currentRent = inp.rent * Math.pow(1 + rentIncrease, Math.max(0, inp.years - 1));

  return {
    ...inp,
    downAmt,
    cmhc,
    mortAmt,
    monthlyMortgage,
    totalMonthly,
    homeValue,
    balance,
    equity,
    totalPaidBuying,
    netBuy,
    totalRent,
    totalInvestValue,
    netRent,
    buyingBetter,
    difference,
    beYear,
    currentRent,
    yearly,
  };
}

export function buildBuyVsRentPdf({
  state,
  reportDate,
}: ReportInput<BuyVsRentReportState>): BuiltPdf {
  let p = makeReport("BuyVsRent", reportDate);
  p = pdfTitle(p, "Buy vs Rent Comparison Report");
  p = pdfHighlight(
    p,
    `After ${state.years} Years`,
    state.buyingBetter
      ? `Buying Saves ${fmtCAD(state.difference)}`
      : `Renting Saves ${fmtCAD(state.difference)}`,
    state.buyingBetter ? "Buying is more affordable" : "Renting costs less",
  );
  p = pdfSubtext(
    p,
    `Home Price: ${fmtCAD(state.price)} | Down: ${state.downPct}% | Rate: ${state.rate.toFixed(2)}% | Rent: ${fmtCAD(state.rent)}/mo`,
    10,
    [80, 80, 80],
  );
  p = pdfTable(p, ["Metric", "Buying", "Renting"], [
    ["Down Payment", fmtCAD(state.downAmt), "—"],
    ["CMHC Insurance", state.cmhc > 0 ? fmtCAD(state.cmhc) : "None", "—"],
    ["Monthly Cost", fmtCADmo(state.totalMonthly), fmtCADmo(state.rent)],
    [`Total Paid (${state.years}yrs)`, fmtCAD(state.totalPaidBuying), fmtCAD(state.totalRent)],
    ["Home / Invested Value", fmtCAD(state.homeValue), fmtCAD(state.totalInvestValue)],
    ["Equity / Net Invest", fmtCAD(state.equity), fmtCAD(state.totalInvestValue - state.totalRent)],
    [
      { t: "Net Position", bold: true },
      { t: fmtCAD(state.netBuy), bold: true },
      { t: fmtCAD(state.netRent), bold: true },
    ],
  ]);
  p = pdfTips(p, "Buy vs Rent Tips", [
    "The Longer You Stay, the Better Buying Looks: Home equity compounds over time through appreciation and mortgage paydown.",
    'Rent is Not "Thrown Away": Renting provides flexibility, no maintenance costs, and the ability to invest the difference.',
    "Break-Even Varies: In high-appreciation markets, buying wins sooner. In slow markets, renting can win for 10+ years.",
    "Consider All Costs: Don't forget property tax, insurance, maintenance, and transaction costs when buying.",
  ]);
  return finishReport(p, "BuyVsRent");
}
