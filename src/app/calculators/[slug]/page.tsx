import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSettings } from "@/lib/cms";
import { seoTitle } from "@/lib/seo";
import { getCalculator, LEGACY_TAB_SLUGS } from "@/lib/calculators/registry";
import { getCalculatorSettings } from "@/lib/calculators/settings";
import { CalculatorPageShell } from "@/components/calculators/CalculatorPageShell";
import { CalculatorLoader } from "@/components/calculators/CalculatorLoader";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const meta = getCalculator(slug);
  if (!meta) return {};
  const title = await seoTitle(meta.seoTitle);
  return {
    title,
    description: meta.seoDescription,
    alternates: { canonical: `https://www.getsetsold.ca/calculators/${slug}` },
    openGraph: { title, description: meta.seoDescription, type: "website" },
    twitter: { card: "summary", title, description: meta.seoDescription },
  };
}

const INTROS: Record<string, string> = {
  "affordability-calculator":
    "See how much home you can afford in Canada. Enter your income, down payment and debts — we'll apply the mortgage stress test, GDS/TDS limits and CMHC rules to your exact numbers. Look up an MLS listing to compare it against your budget.",
  "mortgage-payment-calculator":
    "Calculate your Canadian mortgage payment for monthly, bi-weekly or weekly frequencies. See your amortization schedule, interest over the term, and balance at renewal — plus a fixed vs variable comparison.",
  "purchase-cost-calculator":
    "Your mortgage payment isn't your housing cost. Add property tax, heating and condo fees to see the true monthly cost of a home — with GDS/TDS qualification checks.",
  "maximum-mortgage-calculator":
    "How much will a lender actually approve? Enter your income, debts and housing costs to find your maximum mortgage under Canada's stress-test rules.",
  "required-income-calculator":
    "Found a home you love? Work backwards from the price to find the minimum household income needed to qualify at current rates.",
  "mortgage-renewal-calculator":
    "Your term is ending — don't just sign the renewal letter. Compare your current rate against new offers and see exactly what you'd save.",
  "compare-mortgage-rates":
    "Line up to 3 lenders side by side — different banks, brokers, rates, terms and amortizations — and see which deal actually costs less.",
  "land-transfer-tax-calculator-ontario":
    "Ontario (and Toronto) land transfer tax is progressive and surprises a lot of buyers. Calculate exactly what you'll owe, including first-time buyer rebates.",
  "closing-costs-calculator-canada":
    "Beyond the down payment, budget for everything else: land transfer tax, legal fees, title insurance and the smaller costs buyers forget. Toggle items to fit your purchase.",
  "ontario-hst-rebate-calculator":
    "Buying new or pre-construction in Ontario? See the HST rebate under the expanded 2026 framework versus the previous rules, side by side.",
  "down-payment-comparison-calculator":
    "Should you buy now with 5% down or wait until you have 20%? Compare CMHC insurance, payments and total interest across four down payment levels.",
  "buy-vs-rent-calculator":
    "The real buy-vs-rent math includes closing costs, appreciation and equity — not just rent versus mortgage. Find your breakeven point.",
  "net-proceeds-calculator":
    "Selling? Your sale price isn't what you keep. Deduct commission, legal fees, mortgage penalties and moving costs to see your true net proceeds.",
  "rental-investment-forecast-calculator":
    "Model a rental property like an investor: year-by-year cash flow, expenses, mortgage paydown, equity growth and an optional sale scenario over 5–25 years.",
};

export default async function CalculatorDetailPage({ params }: Props) {
  const { slug } = await params;

  // Legacy ?c=<tabId> style slugs → canonical (also covers old hash-less tab URLs)
  const legacy = LEGACY_TAB_SLUGS[slug];
  if (legacy && legacy !== slug) redirect(`/calculators/${legacy}`);

  const calcMeta = getCalculator(slug) ?? notFound();

  const settings = await getSettings();
  const calcSettings = getCalculatorSettings(settings.calculators);

  return (
    <CalculatorPageShell slug={slug} intro={INTROS[slug] ?? calcMeta.description}>
      <CalculatorLoader slug={slug} settings={calcSettings} />
      <p className="mt-6 text-[12px] text-muted">
        Assumptions effective {calcSettings.effectiveDate}. Regulatory figures (stress-test rules,
        down-payment brackets, CMHC tiers, rebates) are managed in Admin → Calculators.
      </p>
    </CalculatorPageShell>
  );
}
