"use client";
/**
 * Per-calculator dynamic loaders. Each calculator's client component is only
 * bundled on its own page — the hub never loads any calculation engine.
 */
import dynamic from "next/dynamic";
import type { CalculatorSettings } from "@/lib/calculators/types";

export type CalculatorComponent = React.ComponentType<{ settings: CalculatorSettings }>;

const loaders: Record<string, () => Promise<{ default: CalculatorComponent }>> = {
  "affordability-calculator": () =>
    import("./affordability/Calculator").then((m) => ({ default: m.AffordabilityCalculator })),
  "mortgage-payment-calculator": () =>
    import("./mortgage-payment/Calculator").then((m) => ({ default: m.MortgagePaymentCalculator })),
  "purchase-cost-calculator": () =>
    import("./purchase-cost/Calculator").then((m) => ({ default: m.PurchaseCostCalculator })),
  "maximum-mortgage-calculator": () =>
    import("./maximum-mortgage/Calculator").then((m) => ({ default: m.MaximumMortgageCalculator })),
  "required-income-calculator": () =>
    import("./required-income/Calculator").then((m) => ({ default: m.RequiredIncomeCalculator })),
  "mortgage-renewal-calculator": () =>
    import("./mortgage-renewal/Calculator").then((m) => ({ default: m.MortgageRenewalCalculator })),
  "compare-mortgage-rates": () =>
    import("./compare-mortgage/Calculator").then((m) => ({ default: m.CompareMortgageCalculator })),
  "land-transfer-tax-calculator-ontario": () =>
    import("./land-transfer-tax/Calculator").then((m) => ({ default: m.LandTransferTaxCalculator })),
  "closing-costs-calculator-canada": () =>
    import("./closing-costs/Calculator").then((m) => ({ default: m.ClosingCostsCalculator })),
  "ontario-hst-rebate-calculator": () =>
    import("./hst-rebate/Calculator").then((m) => ({ default: m.HstRebateCalculator })),
  "down-payment-comparison-calculator": () =>
    import("./down-payment/Calculator").then((m) => ({ default: m.DownPaymentCalculator })),
  "buy-vs-rent-calculator": () =>
    import("./buy-vs-rent/Calculator").then((m) => ({ default: m.BuyVsRentCalculator })),
  "net-proceeds-calculator": () =>
    import("./net-proceeds/Calculator").then((m) => ({ default: m.NetProceedsCalculator })),
  "rental-investment-forecast-calculator": () =>
    import("./rental-forecast/Calculator").then((m) => ({ default: m.RentalForecastCalculator })),
};

export function loadCalculator(slug: string): CalculatorComponent | null {
  const load = loaders[slug];
  if (!load) return null;
  return dynamic(load, {
    loading: () => (
      <div className="rounded-[var(--radius-md)] border border-line bg-white p-10 text-center text-muted shadow-[var(--shadow)]">
        Loading calculator…
      </div>
    ),
  });
}
