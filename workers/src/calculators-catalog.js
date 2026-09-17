// The fixed list of the 14 calculators in your calculators.html hub —
// slugs/titles/descriptions taken directly from that file's own JSON-LD
// (schema.org WebApplication "hasPart" list), so they match its own
// internal routing exactly (it opens the right tab for /calculators/<slug>
// itself — see its checkURL()/openCalc()). This catalog doesn't drive the
// calculators' math or UI at all (that all lives in the uploaded HTML file
// itself, unmodified) — it only exists so the CMS admin knows these 14
// pages exist: to list them in the Calculators tab and to offer them as
// pickable links in the Menu & Footer "Link to" picker (ref_type: 'calculator').
export const CALCULATORS = [
  { slug: "affordability-calculator", title: "Affordability Calculator", description: "Calculate how much home you can afford based on income, down payment, debts and GDS/TDS ratios." },
  { slug: "mortgage-payment-calculator", title: "Mortgage Payment Calculator", description: "Calculate monthly mortgage payments with amortization schedule and multiple payment frequencies." },
  { slug: "purchase-cost-calculator", title: "Purchase Cost Calculator", description: "Estimate total monthly housing costs including mortgage, tax, heating and qualification check." },
  { slug: "maximum-mortgage-calculator", title: "Maximum Mortgage Calculator", description: "Find your maximum qualifying mortgage based on income, debts and housing expenses." },
  { slug: "required-income-calculator", title: "Required Income Calculator", description: "Determine minimum household income needed for a target property purchase." },
  { slug: "mortgage-renewal-calculator", title: "Mortgage Renewal Calculator", description: "Compare current mortgage rate with renewal options and calculate interest savings." },
  { slug: "compare-mortgage-rates", title: "Mortgage Comparison Calculator", description: "Compare up to 3 mortgage scenarios side by side with custom lender names." },
  { slug: "land-transfer-tax-calculator-ontario", title: "Land Transfer Tax Calculator", description: "Calculate Ontario and Toronto land transfer tax with first-time buyer rebates." },
  { slug: "closing-costs-calculator-canada", title: "Closing Costs Calculator", description: "Estimate all closing costs including LTT, legal fees, title insurance and ancillary items." },
  { slug: "ontario-hst-rebate-calculator", title: "Ontario HST Rebate Calculator", description: "Calculate the $130K HST rebate for new pre-construction homes under Ontario's expanded rebate program." },
  { slug: "down-payment-comparison-calculator", title: "Down Payment Comparison Calculator", description: "Compare 5%, 10%, 15% and 20% down payments side by side. See savings on mortgage insurance, monthly payments and total interest." },
  { slug: "buy-vs-rent-calculator", title: "Buy vs Rent Calculator", description: "Compare the total cost of buying a home versus renting over any time period. See when buying breaks even and equity built." },
  { slug: "net-proceeds-calculator", title: "Net Proceeds Calculator", description: "Calculate your net proceeds from selling a home in Ontario. See exactly what you keep after mortgage payout, agent commission, legal fees, and closing costs." },
  { slug: "rental-investment-forecast-calculator", title: "Rental Investment Forecast Calculator", description: "Forecast rental property returns with year-by-year cash flow, equity growth, mortgage payoff, and total ROI. Includes property appreciation, expense tracking, and sale proceeds analysis." },
];
