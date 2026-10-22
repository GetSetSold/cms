/** Shared types for the calculators module. */

export interface CmhcTier {
  upTo: number; // max loan-to-value for this tier (e.g. 0.8)
  rate: number; // premium rate as a decimal (e.g. 0.0315)
}

/** Numbers behind the marketing calculator block (fee-savings / cash-back).
 *  Editable in Admin → Calculators → "Marketing Blocks" tab. */
export interface MarketingCalculatorSettings {
  listingTraditionalPct: number; // e.g. 2.5 — the "typical" listing fee %
  listingOurPct: number; // e.g. 1 — GetSetSold listing fee %
  cashbackRatePct: number; // e.g. 0.25 — buyer cash-back rate %
  cashbackCap: number; // e.g. 5000 — max buyer cash back $
  sliderMin: number; // slider range min $
  sliderMax: number; // slider range max $
  listingDefault: number; // listing slider default $
  buyerDefault: number; // buyer slider default $
}

/** Regulatory / default assumptions, editable in Admin → Calculators.
 *  Ported 1:1 from the legacy CFG_DEFAULTS so math stays identical. */
export interface CalculatorSettings {
  stressBuffer: number; // % added to contract rate for the qualifying rate
  stressFloor: number; // minimum qualifying rate %
  gdsLimit: number; // GDS maximum %
  tdsLimit: number; // TDS maximum %
  dp1pct: number;
  dp1max: number; // bracket 1: dp1pct up to dp1max
  dp2pct: number;
  dp2max: number; // bracket 2: dp2pct from dp1max to dp2max
  dp3pct: number; // bracket 3: dp3pct above dp2max
  cmhcTiers: CmhcTier[];
  onRebate: number; // Ontario first-time buyer LTT rebate ($)
  toRebate: number; // Toronto first-time buyer LTT rebate ($)
  effectiveDate: string; // human label, e.g. "2026-01-01" — when these assumptions take effect
  lastUpdated?: string; // ISO timestamp of the last admin save
  marketing: MarketingCalculatorSettings; // marketing calculator block numbers
}

export type PaymentFrequency = "weekly" | "biweekly" | "monthly";
export type RateType = "fixed" | "variable";

export interface AmortRow {
  n: number;
  date: string; // ISO yyyy-mm-dd
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

export interface CalculatorFaq {
  q: string;
  a: string;
}

export type CalculatorCategory =
  | "Mortgage & Affordability"
  | "Taxes & Closing Costs"
  | "Buy vs Sell Decisions"
  | "Investing";

export interface CalculatorMeta {
  slug: string;
  title: string;
  description: string;
  category: CalculatorCategory;
  /** Badge shown on the hub card, e.g. "Most Popular" or "New". */
  tag?: string;
  seoTitle: string;
  seoDescription: string;
  faqs: CalculatorFaq[];
  /** Slugs of related calculators shown at the bottom of the detail page. */
  related: string[];
}

/** What a calculator's pdf.ts builder receives and returns. */
export interface ReportInput<TState> {
  state: TState;
  settings: CalculatorSettings;
  /** e.g. "2026-10-04" */
  reportDate: string;
}

export interface BuiltPdf {
  bytes: Uint8Array;
  filename: string;
}
