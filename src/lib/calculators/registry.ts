/**
 * Single source of truth for all calculators.
 * Drives: /calculators hub, /calculators/[slug] routes, sitemap,
 * prev/next nav, SEO metadata + schema. Adding a calculator = one entry here
 * + its component + its pdf.ts. No route file needed.
 */
import type { CalculatorMeta } from "./types";

export const CALCULATORS: CalculatorMeta[] = [
  {
    slug: "affordability-calculator",
    title: "Affordability Calculator",
    description:
      "How much home can you afford? Enter your income, down payment, debts and see your maximum affordable price with Afford Score and GDS/TDS qualification checks.",
    category: "Mortgage & Affordability",
    tag: "Most Popular",
    seoTitle: "Home Affordability Calculator Canada | How Much Can I Afford?",
    seoDescription:
      "Free Canadian home affordability calculator. Enter your income, down payment and debts to see your maximum affordable home price with GDS/TDS checks and stress-test qualifying rate.",
    faqs: [
      { q: "How much home can I afford with my income?", a: "As a rough rule, lenders let your housing costs (mortgage, tax, heat) take up to 32% of gross income (GDS) and all debts up to 40% (TDS). This calculator applies those limits plus the mortgage stress test to your exact numbers." },
      { q: "What is the mortgage stress test?", a: "Canadian lenders qualify you at the higher of your contract rate plus 2% or 5.25%. The calculator uses the current qualifying rules automatically." },
      { q: "Does the down payment affect affordability?", a: "Yes — a larger down payment lowers your mortgage amount and can eliminate CMHC insurance at 20% down, which raises the price you qualify for." },
    ],
    related: ["mortgage-payment-calculator", "maximum-mortgage-calculator", "required-income-calculator"],
  },
  {
    slug: "mortgage-payment-calculator",
    title: "Mortgage Payment Calculator",
    description:
      "Calculate your monthly mortgage payment with full amortization schedule. Compare weekly, bi-weekly and monthly payment frequencies.",
    category: "Mortgage & Affordability",
    seoTitle: "Mortgage Payment Calculator Canada | Monthly, Bi-Weekly & Weekly",
    seoDescription:
      "Free Canadian mortgage payment calculator with full amortization schedule. Compare monthly, bi-weekly and weekly payments, see term interest and balance at renewal.",
    faqs: [
      { q: "How is a Canadian mortgage payment calculated?", a: "Canadian mortgages compound semi-annually, not in advance. The payment formula converts the annual rate to an equivalent periodic rate, then amortizes the balance over your amortization period." },
      { q: "Do accelerated bi-weekly payments save money?", a: "Yes — accelerated bi-weekly means 26 full half-payments a year (the equivalent of 13 monthly payments), which cuts years off your amortization and tens of thousands in interest." },
      { q: "What is the balance at renewal?", a: "It's what you'll still owe when your term ends. The calculator shows interest paid over the term and the remaining balance so you can plan your renewal." },
    ],
    related: ["affordability-calculator", "mortgage-renewal-calculator", "compare-mortgage-rates"],
  },
  {
    slug: "purchase-cost-calculator",
    title: "Purchase Cost Calculator",
    description:
      "Estimate your total monthly housing costs including mortgage, property tax, heating and condo fees with GDS/TDS ratio validation.",
    category: "Mortgage & Affordability",
    seoTitle: "Home Purchase Cost Calculator Canada | True Monthly Cost",
    seoDescription:
      "Estimate your true monthly cost of buying a home in Canada — mortgage, property tax, heating, condo fees — with GDS/TDS qualification checks.",
    faqs: [
      { q: "What costs should I include beyond the mortgage?", a: "Property tax, heating, condo/strata fees, and home insurance at minimum. Lenders use these in your GDS ratio, so leaving them out overstates what you qualify for." },
      { q: "Why do I fail GDS/TDS on a home I can afford?", a: "The ratios use gross income and the stress-test rate, not your contract rate. The calculator shows which ratio fails so you know whether to raise income, cut debts, or lower the price." },
    ],
    related: ["affordability-calculator", "closing-costs-calculator-canada", "required-income-calculator"],
  },
  {
    slug: "maximum-mortgage-calculator",
    title: "Maximum Mortgage Calculator",
    description:
      "Find the maximum mortgage you qualify for based on your income, debts and housing expenses. Includes stress test qualifying rate.",
    category: "Mortgage & Affordability",
    seoTitle: "Maximum Mortgage Calculator Canada | How Much Will the Bank Lend?",
    seoDescription:
      "Find the maximum mortgage you qualify for in Canada based on income, debts and housing costs, using the mortgage stress-test qualifying rate.",
    faqs: [
      { q: "Why is my maximum mortgage lower than I expected?", a: "Lenders qualify you at the stress-test rate (contract + 2% or 5.25%, whichever is higher) and cap GDS/TDS ratios. Both constraints usually bind before your comfort level does." },
      { q: "How can I increase my maximum mortgage?", a: "Raise household income, pay down monthly debts, increase your down payment, or choose a lower rate or longer amortization." },
    ],
    related: ["affordability-calculator", "required-income-calculator", "mortgage-payment-calculator"],
  },
  {
    slug: "required-income-calculator",
    title: "Required Income Calculator",
    description:
      "Determine the minimum household income needed to qualify for your target property at current rates and amortization.",
    category: "Mortgage & Affordability",
    seoTitle: "Required Income Calculator Canada | Income Needed to Qualify",
    seoDescription:
      "What income do you need to buy a specific home? Free Canadian calculator showing the minimum household income to qualify at current rates and stress-test rules.",
    faqs: [
      { q: "How much income do I need for a $600,000 home?", a: "It depends on your down payment, rate, debts and property taxes — but as a starting point, lenders want your housing costs under 32% of gross income at the stress-test rate. Enter your exact numbers for a precise answer." },
      { q: "Is bonus or overtime income counted?", a: "Lenders typically average variable income over two years and may discount it. This calculator uses the income figure you enter, so use a conservative number if your pay varies." },
    ],
    related: ["affordability-calculator", "maximum-mortgage-calculator", "purchase-cost-calculator"],
  },
  {
    slug: "mortgage-renewal-calculator",
    title: "Mortgage Renewal Calculator",
    description:
      "Compare your current mortgage rate with renewal options. See monthly savings and total interest saved over the remaining amortization.",
    category: "Mortgage & Affordability",
    seoTitle: "Mortgage Renewal Calculator Canada | Compare Renewal Rates",
    seoDescription:
      "Compare your current mortgage rate against renewal offers. See monthly savings, interest saved over the term, and balance at next renewal.",
    faqs: [
      { q: "When should I start shopping for renewal rates?", a: "Most lenders let you lock a renewal rate 120 days before your term ends. Start comparing early — you can usually take a better rate if one appears before renewal day." },
      { q: "Should I switch lenders at renewal?", a: "Switching can get you a better rate, but factor in discharge/registration fees and whether you need to re-qualify. The interest-savings figure here helps you weigh it." },
    ],
    related: ["mortgage-payment-calculator", "compare-mortgage-rates", "affordability-calculator"],
  },
  {
    slug: "compare-mortgage-rates",
    title: "Compare Mortgage Scenarios",
    description:
      "Compare up to 3 lenders side by side. Name each bank or broker, set custom rates, terms and amortization periods to find the best deal.",
    category: "Mortgage & Affordability",
    seoTitle: "Compare Mortgage Rates Canada | Side-by-Side Scenario Comparison",
    seoDescription:
      "Compare up to 3 mortgage scenarios side by side — different lenders, rates, terms and amortizations — to find the best deal in Canada.",
    faqs: [
      { q: "What matters more: rate or amortization?", a: "Both move your total cost. A lower rate with a longer amortization can still cost more interest overall — the total-interest row in the comparison makes the trade-off visible." },
      { q: "Should I compare fixed vs variable here?", a: "Yes — set one scenario to a variable rate to see the payment and interest difference against fixed offers over the same term." },
    ],
    related: ["mortgage-payment-calculator", "mortgage-renewal-calculator", "down-payment-comparison-calculator"],
  },
  {
    slug: "land-transfer-tax-calculator-ontario",
    title: "Land Transfer Tax Calculator",
    description:
      "Calculate Ontario and Toronto land transfer tax with first-time home buyer rebates. See the full progressive rate breakdown.",
    category: "Taxes & Closing Costs",
    seoTitle: "Ontario Land Transfer Tax Calculator 2026 | Toronto LTT + Rebates",
    seoDescription:
      "Calculate Ontario and Toronto land transfer tax with first-time home buyer rebates. Full progressive bracket breakdown for 2026.",
    faqs: [
      { q: "How much is land transfer tax in Ontario?", a: "It's progressive: 0.5% on the first $55,000, 1.0% to $250,000, 1.5% to $400,000, 2.0% to $2M, and 2.5% above. Toronto adds a second, identical municipal tax." },
      { q: "Do first-time buyers pay land transfer tax in Ontario?", a: "First-time buyers get a rebate up to $4,000 on Ontario LTT and up to $4,475 on Toronto LTT — enough to eliminate the tax entirely on homes up to about $368,000." },
      { q: "Do I pay double land transfer tax in Toronto?", a: "Yes — Toronto purchases pay both the Ontario provincial tax and the Toronto municipal tax, though first-time buyer rebates apply to each." },
    ],
    related: ["closing-costs-calculator-canada", "purchase-cost-calculator", "ontario-hst-rebate-calculator"],
  },
  {
    slug: "closing-costs-calculator-canada",
    title: "Closing Costs Calculator",
    description:
      "Estimate all closing costs including land transfer tax, CMHC, legal fees, title insurance and customizable ancillary items.",
    category: "Taxes & Closing Costs",
    seoTitle: "Closing Costs Calculator Canada | Estimate All Closing Fees",
    seoDescription:
      "Estimate every closing cost on a Canadian home purchase — land transfer tax, CMHC insurance, legal fees, title insurance and more, with customizable line items.",
    faqs: [
      { q: "How much are closing costs in Canada?", a: "Budget 1.5–4% of the purchase price on top of your down payment. Land transfer tax is usually the biggest line item in Ontario." },
      { q: "Are closing costs due on closing day?", a: "Yes — your lawyer collects them with the rest of your funds on closing. Lenders want to see you have closing costs covered separately from the down payment." },
    ],
    related: ["land-transfer-tax-calculator-ontario", "purchase-cost-calculator", "affordability-calculator"],
  },
  {
    slug: "ontario-hst-rebate-calculator",
    title: "Ontario HST Rebate Calculator",
    description:
      "Calculate the new $130K HST rebate for pre-construction homes. Compare expanded new rules vs. existing rebate framework side by side.",
    category: "Taxes & Closing Costs",
    tag: "New 2026",
    seoTitle: "Ontario HST Rebate Calculator 2026 | New Housing Rebate",
    seoDescription:
      "Calculate the Ontario HST rebate on a new or pre-construction home. Compare the expanded 2026 rules against the existing rebate framework.",
    faqs: [
      { q: "What is the HST rebate on a new home in Ontario?", a: "Buyers of new homes can recover part of the HST paid. The 2026 framework expanded the rebate — this calculator compares the new rules against the previous framework side by side." },
      { q: "Does the rebate apply to resale homes?", a: "No — the new housing rebate applies to newly built or substantially renovated homes, including pre-construction purchases from a builder." },
    ],
    related: ["land-transfer-tax-calculator-ontario", "closing-costs-calculator-canada", "purchase-cost-calculator"],
  },
  {
    slug: "down-payment-comparison-calculator",
    title: "Down Payment Comparison Calculator",
    description:
      "Compare 5%, 10%, 15% and 20% down payments side by side. See how much you save on mortgage insurance, monthly payments and total interest. Should you buy now or wait and save?",
    category: "Mortgage & Affordability",
    tag: "New",
    seoTitle: "Down Payment Comparison Calculator Canada | 5% vs 10% vs 20%",
    seoDescription:
      "Compare 5%, 10%, 15% and 20% down payments side by side in Canada. See CMHC insurance savings, monthly payment differences and total interest — buy now or wait?",
    faqs: [
      { q: "Is it better to put 20% down?", a: "At 20% you skip CMHC insurance entirely, which saves thousands upfront plus interest. But waiting to save 20% while prices rise can cost more than the insurance — the comparison shows both sides." },
      { q: "What is the minimum down payment in Canada?", a: "5% on the first $500,000, 10% on the portion from $500,000 to $1M, and 20% on homes over $1M." },
    ],
    related: ["mortgage-payment-calculator", "affordability-calculator", "compare-mortgage-rates"],
  },
  {
    slug: "buy-vs-rent-calculator",
    title: "Buy vs Rent Calculator",
    description:
      "Compare the total cost of buying a home versus renting over any time period. See when buying breaks even and how much equity you build. Make an informed decision with a clear side-by-side comparison.",
    category: "Buy vs Sell Decisions",
    tag: "New",
    seoTitle: "Buy vs Rent Calculator Canada | Should I Buy or Rent?",
    seoDescription:
      "Should you buy or rent in Canada? Compare the total cost of buying vs renting over any time horizon, see the breakeven point and equity built.",
    faqs: [
      { q: "Is buying always better than renting?", a: "Not always — over short horizons, closing costs, CMHC insurance and interest can outweigh equity gains. The breakeven point here shows when buying pulls ahead for your numbers." },
      { q: "What assumptions matter most?", a: "Home price appreciation, rent inflation, and your time horizon. Small changes in appreciation compound enormously over 10+ years, so test conservative and optimistic cases." },
    ],
    related: ["affordability-calculator", "rental-investment-forecast-calculator", "purchase-cost-calculator"],
  },
  {
    slug: "net-proceeds-calculator",
    title: "Net Proceeds Calculator",
    description:
      "Estimate how much you keep after selling your property. Deduct realtor commission, legal fees, mortgage penalty, discharge fee, moving costs, staging and more. See your net profit instantly.",
    category: "Buy vs Sell Decisions",
    tag: "New",
    seoTitle: "Net Proceeds Calculator Canada | What You Keep After Selling",
    seoDescription:
      "Selling your home? Estimate your net proceeds after realtor commission, legal fees, mortgage penalty, discharge fees and moving costs.",
    faqs: [
      { q: "What are the biggest costs when selling?", a: "Realtor commission is usually the largest, followed by any mortgage prepayment penalty. Legal fees, discharge fees, moving and staging add up too." },
      { q: "How do I estimate my mortgage penalty?", a: "Fixed mortgages typically charge the greater of 3 months' interest or the interest-rate differential (IRD). Ask your lender for the exact figure before listing — it varies widely." },
    ],
    related: ["affordability-calculator", "purchase-cost-calculator", "rental-investment-forecast-calculator"],
  },
  {
    slug: "rental-investment-forecast-calculator",
    title: "Rental Investment Forecast",
    description:
      "Forecast cash flow, equity & profit for a rental property over 5-25 years. See year-by-year income, expenses, mortgage paydown and optional sale scenario.",
    category: "Investing",
    tag: "New",
    seoTitle: "Rental Property Investment Calculator Canada | Cash Flow Forecast",
    seoDescription:
      "Forecast a Canadian rental property's cash flow, equity and profit over 5–25 years. Year-by-year income, expenses, mortgage paydown and sale scenario.",
    faqs: [
      { q: "What is a good cash flow for a rental property?", a: "Investors often target positive cash flow after all expenses including vacancy and maintenance allowances — not just mortgage vs rent. This forecast includes the full expense picture." },
      { q: "Should I include appreciation in my analysis?", a: "Run it both ways. Cash flow tells you if the property sustains itself; appreciation drives most long-term returns in Canadian markets. The sale scenario separates the two." },
    ],
    related: ["buy-vs-rent-calculator", "mortgage-payment-calculator", "net-proceeds-calculator"],
  },
];

export const CALCULATOR_MAP: Record<string, CalculatorMeta> = Object.fromEntries(
  CALCULATORS.map((c) => [c.slug, c]),
);

export function getCalculator(slug: string): CalculatorMeta | null {
  return CALCULATOR_MAP[slug] ?? null;
}

/** Legacy tab IDs (?c= / #tab-) → canonical slugs, for 301 redirects. */
export const LEGACY_TAB_SLUGS: Record<string, string> = {
  afford: "affordability-calculator",
  mortgage: "mortgage-payment-calculator",
  purchase: "purchase-cost-calculator",
  maxmortgage: "maximum-mortgage-calculator",
  income: "required-income-calculator",
  renewal: "mortgage-renewal-calculator",
  compare: "compare-mortgage-rates",
  ltt: "land-transfer-tax-calculator-ontario",
  closing: "closing-costs-calculator-canada",
  hst: "ontario-hst-rebate-calculator",
  downpay: "down-payment-comparison-calculator",
  buyvsrent: "buy-vs-rent-calculator",
  netproceed: "net-proceeds-calculator",
  rental: "rental-investment-forecast-calculator",
};
