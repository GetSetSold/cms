/**
 * Shared mortgage / tax math for all calculators.
 * Ported 1:1 from the legacy calculators page (PI, PI_FREQ, TERM, TERM_FREQ,
 * QR, CMHC, MinDP, ONLTT, TOLTT) so results match the old site.
 * NOTE — legacy rate conventions (preserved deliberately):
 *   monthlyPI / nominalTermSummary use the nominal monthly rate (r/100/12),
 *   exactly like legacy PI()/TERM() — used by every calculator EXCEPT the
 *   mortgage payment calculator.
 *   periodicPI / termSummary use the effective periodic rate
 *   (1+r)^(1/ppY)-1, exactly like legacy PI_FREQ()/TERM_FREQ() — used only
 *   by the mortgage payment calculator (headline, term figures, schedules).
 */
import type { CalculatorSettings, PaymentFrequency } from "./types";

/** $1,234 */
export function fmtCAD(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-CA");
}

/** $1,234/mo */
export function fmtCADmo(n: number): string {
  return fmtCAD(n) + "/mo";
}

/** Parse a user-entered currency/number string. */
export function parseNum(s: string | number | null | undefined): number {
  if (typeof s === "number") return Number.isFinite(s) ? s : 0;
  return parseFloat(String(s ?? "0").replace(/[^0-9.\-]/g, "")) || 0;
}

/** Monthly principal + interest, standard Canadian mortgage formula. */
export function monthlyPI(principal: number, annualRatePct: number, amortYears: number): number {
  if (principal <= 0 || annualRatePct <= 0 || amortYears <= 0) return 0;
  const m = annualRatePct / 100 / 12;
  const n = amortYears * 12;
  const c = Math.pow(1 + m, n);
  return (principal * (m * c)) / (c - 1);
}

function periodsPerYear(freq: PaymentFrequency): number {
  return freq === "weekly" ? 52 : freq === "biweekly" ? 26 : 12;
}

/**
 * Periodic payment for weekly/biweekly/monthly.
 * Canadian convention: periodicRate = (1 + annualRate)^(1/ppY) - 1.
 */
export function periodicPI(
  principal: number,
  annualRatePct: number,
  amortYears: number,
  freq: PaymentFrequency,
): number {
  if (principal <= 0 || annualRatePct <= 0 || amortYears <= 0) return 0;
  const ppY = periodsPerYear(freq);
  const periodicRate = Math.pow(1 + annualRatePct / 100, 1 / ppY) - 1;
  const n = amortYears * ppY;
  if (periodicRate <= 0) return principal / n;
  const c = Math.pow(1 + periodicRate, n);
  return (principal * (periodicRate * c)) / (c - 1);
}

/** Interest paid + remaining balance over a term (frequency-aware). */
export function termSummary(
  principal: number,
  annualRatePct: number,
  amortYears: number,
  termYears: number,
  freq: PaymentFrequency = "monthly",
): { intPaid: number; balance: number } {
  if (principal <= 0 || annualRatePct <= 0 || amortYears <= 0 || termYears <= 0)
    return { intPaid: 0, balance: principal };
  const ppY = periodsPerYear(freq);
  const periodicRate = Math.pow(1 + annualRatePct / 100, 1 / ppY) - 1;
  const pmt = periodicPI(principal, annualRatePct, amortYears, freq);
  if (pmt <= 0) return { intPaid: 0, balance: principal };
  let bal = principal;
  let totInt = 0;
  const termPeriods = Math.min(termYears * ppY, amortYears * ppY);
  for (let i = 0; i < termPeriods; i++) {
    const intPmt = bal * periodicRate;
    totInt += intPmt;
    const prinPmt = Math.min(pmt - intPmt, bal);
    bal -= prinPmt;
    if (bal < 0.01) bal = 0;
  }
  return { intPaid: totInt, balance: bal };
}

/**
 * Term interest + balance with the NOMINAL monthly rate (r/100/12).
 * Exact port of legacy TERM() — used by renewal & compare calculators.
 * (termSummary above is the effective-rate port of legacy TERM_FREQ,
 * used only by the mortgage payment calculator.)
 */
export function nominalTermSummary(
  principal: number,
  annualRatePct: number,
  amortYears: number,
  termYears: number,
): { intPaid: number; balance: number } {
  if (principal <= 0 || annualRatePct <= 0 || amortYears <= 0 || termYears <= 0)
    return { intPaid: 0, balance: principal };
  const m = annualRatePct / 100 / 12;
  const n = amortYears * 12;
  const c = Math.pow(1 + m, n);
  const pmt = (principal * (m * c)) / (c - 1);
  if (pmt <= 0) return { intPaid: 0, balance: principal };
  let bal = principal;
  let totInt = 0;
  const months = Math.min(termYears * 12, amortYears * 12);
  for (let i = 0; i < months; i++) {
    const intPmt = bal * m;
    totInt += intPmt;
    const prinPmt = Math.min(pmt - intPmt, bal);
    bal -= prinPmt;
    if (bal < 0.01) bal = 0;
  }
  return { intPaid: totInt, balance: bal };
}

/** OSFI-style stress-test qualifying rate: max(contract + buffer, floor). */
export function qualifyingRate(contractRatePct: number, s: CalculatorSettings): number {
  return Math.max(contractRatePct + s.stressBuffer, s.stressFloor);
}

/** CMHC premium $ for a given loan + price. 0 when LTV <= 80%. */
export function cmhcPremium(loan: number, price: number, s: CalculatorSettings): number {
  if (loan <= 0 || price <= 0) return 0;
  const ltv = loan / price;
  if (ltv <= 0.8) return 0;
  const tiers = s.cmhcTiers;
  for (const t of tiers) {
    if (ltv <= t.upTo) return loan * t.rate;
  }
  return loan * tiers[tiers.length - 1].rate;
}

/** Canadian minimum down payment for a price, using the configured brackets. */
export function minDownPayment(price: number, s: CalculatorSettings): number {
  if (price <= s.dp1max) return (price * s.dp1pct) / 100;
  if (price <= s.dp2max)
    return (s.dp1max * s.dp1pct) / 100 + ((price - s.dp1max) * s.dp2pct) / 100;
  return (
    (s.dp1max * s.dp1pct) / 100 +
    ((s.dp2max - s.dp1max) * s.dp2pct) / 100 +
    ((price - s.dp2max) * s.dp3pct) / 100
  );
}

function progressiveLTT(price: number): number {
  let t = 0;
  if (price > 2000000) t += (price - 2000000) * 0.025;
  if (price > 400000) t += (Math.min(price, 2000000) - 400000) * 0.02;
  if (price > 250000) t += (Math.min(price, 400000) - 250000) * 0.015;
  if (price > 55000) t += (Math.min(price, 250000) - 55000) * 0.01;
  t += Math.min(price, 55000) * 0.005;
  return t;
}

/** Ontario land transfer tax (progressive brackets). */
export function ontarioLTT(price: number): number {
  return progressiveLTT(price);
}

/** Toronto MLTT (same brackets as Ontario). */
export function torontoLTT(price: number): number {
  return progressiveLTT(price);
}

/** Per-bracket breakdown for display, top bracket first. */
export function lttBracketBreakdown(price: number): { label: string; rate: string; tax: number }[] {
  const brackets = [
    { label: "First $55,000", rate: "0.5%", min: 0, max: 55000, r: 0.005 },
    { label: "$55,001 – $250,000", rate: "1.0%", min: 55000, max: 250000, r: 0.01 },
    { label: "$250,001 – $400,000", rate: "1.5%", min: 250000, max: 400000, r: 0.015 },
    { label: "$400,001 – $2,000,000", rate: "2.0%", min: 400000, max: 2000000, r: 0.02 },
    { label: "Over $2,000,000", rate: "2.5%", min: 2000000, max: Infinity, r: 0.025 },
  ];
  return brackets
    .map((b) => ({
      label: b.label,
      rate: b.rate,
      tax: Math.max(0, Math.min(price, b.max) - b.min) * b.r,
    }))
    .filter((b) => b.tax > 0);
}

/** "5-yr term" / "6-mo term" */
export function termLabel(t: number): string {
  return t < 1 ? `${t * 12}-mo term` : `${t}-yr term`;
}

export function freqLabel(freq: PaymentFrequency): string {
  return freq === "weekly" ? "Weekly" : freq === "biweekly" ? "Bi-Weekly" : "Monthly";
}

/** GDS/TDS ratios. housing = P&I + tax + heat (+ 50% condo fees for GDS). */
export function gdsTds(
  annualIncome: number,
  housingMonthly: number,
  debtsMonthly: number,
): { gds: number; tds: number } {
  if (annualIncome <= 0) return { gds: 0, tds: 0 };
  const gds = (housingMonthly / (annualIncome / 12)) * 100;
  const tds = ((housingMonthly + debtsMonthly) / (annualIncome / 12)) * 100;
  return { gds, tds };
}

function addMonthsISO(iso: string, months: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function addWeeksISO(iso: string, weeks: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

/**
 * Full amortization schedule rows. For weekly/biweekly the legacy page steps
 * by week count; we keep the same period math as periodicPI/termSummary.
 */
export function amortizationSchedule(
  mortgage: number,
  annualRatePct: number,
  amortYears: number,
  freq: PaymentFrequency,
  startISO: string,
  maxPeriods?: number,
): { n: number; date: string; payment: number; interest: number; principal: number; balance: number }[] {
  if (mortgage <= 0 || annualRatePct <= 0 || amortYears <= 0) return [];
  const ppY = periodsPerYear(freq);
  const periodicRate = Math.pow(1 + annualRatePct / 100, 1 / ppY) - 1;
  const pmt = periodicPI(mortgage, annualRatePct, amortYears, freq);
  const total = Math.min(maxPeriods ?? amortYears * ppY, amortYears * ppY);
  const rows: { n: number; date: string; payment: number; interest: number; principal: number; balance: number }[] = [];
  let bal = mortgage;
  for (let i = 0; i < total; i++) {
    const interest = bal * periodicRate;
    const principal = Math.min(pmt - interest, bal);
    bal -= principal;
    if (bal < 0.01) bal = 0;
    // Row #1 is dated the start date itself (legacy parity: the first
    // payment falls on the chosen start date, not one period later).
    const date =
      freq === "monthly" ? addMonthsISO(startISO, i) : addWeeksISO(startISO, i * (freq === "weekly" ? 1 : 2));
    rows.push({ n: i + 1, date, payment: pmt, interest, principal, balance: bal });
    if (bal <= 0) break;
  }
  return rows;
}

/** Today's date as yyyy-mm-dd in America/Toronto. */
export function todayISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
}
