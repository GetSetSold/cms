import type { Metadata } from "next";
import { BocTracker } from "@/components/boc/BocTracker";
import { BocAdSlot } from "@/components/boc/BocAdSlot";
import { getSettings, getLogo } from "@/lib/cms";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";

export const metadata: Metadata = {
  title: "Bank of Canada Interest Rate Tracker | Live BoC Policy Rate, Prime Rate & Mortgage Rates Canada",
  description:
    "Track the Bank of Canada interest rate in real-time. See today's BoC policy rate, prime rate, CORRA, mortgage rates from RBC, TD, BMO, Scotiabank, CIBC. Historical rate trends, next decision countdown & impact on Canadian real estate.",
  alternates: { canonical: "https://www.getsetsold.ca/bank-of-canada-rates-guide" },
};

const FAQS = [
  {
    q: "What is the Bank of Canada policy interest rate?",
    a: "The Bank of Canada policy interest rate, also known as the target for the overnight rate, is the key interest rate set by the Bank of Canada to influence the Canadian economy. It affects borrowing costs for banks, which then impacts mortgage rates, line of credit rates, and other consumer lending rates across Canada. This rate is reviewed and adjusted eight times per year on scheduled announcement dates.",
  },
  {
    q: "How often does the Bank of Canada change interest rates?",
    a: "The Bank of Canada reviews and sets its policy rate eight times per year on predetermined dates. The Bank can raise, lower, or hold the rate steady at each decision. Rate decisions are announced at 10:00 AM Eastern Time on decision days and are closely watched by financial markets, economists, real estate professionals, and consumers.",
  },
  {
    q: "How does the Bank of Canada rate affect mortgage rates in Canada?",
    a: "When the Bank of Canada changes its policy rate, variable-rate mortgages are affected almost immediately since they are tied to the prime rate. Fixed mortgage rates are influenced more by bond market yields and market expectations but also respond to Bank of Canada rate trends over time. A 0.25% rate change on a $500,000 mortgage can change monthly payments by over $65, significantly impacting affordability for Canadian homebuyers.",
  },
  {
    q: "What is CORRA and how is it different from the prime rate?",
    a: "CORRA (Canadian Overnight Repo Rate Average) is a risk-free interest rate benchmark that measures the cost of overnight borrowing between financial institutions. It replaced CDOR as Canada's primary benchmark rate. The prime rate is the lending rate that banks offer to their best customers, typically set at the Bank of Canada policy rate plus approximately 2.2%. CORRA influences variable-rate mortgages and other financial products.",
  },
  {
    q: "What is the current prime rate at major Canadian banks?",
    a: "All major Canadian banks (RBC, TD, Scotiabank, BMO, CIBC) typically set their prime rate at the same level, approximately 2.2% above the Bank of Canada policy rate. When the Bank of Canada changes its policy rate, the major banks usually adjust their prime rates within days. This page tracks all five major bank prime rates in real-time.",
  },
  {
    q: "How does the Bank of Canada rate affect Canadian real estate prices?",
    a: "Higher Bank of Canada rates generally cool the housing market by reducing affordability, slowing buyer demand, and increasing carrying costs for homeowners with variable-rate mortgages. Lower rates tend to stimulate housing demand, increase competition among buyers, and push home prices higher. The relationship is cyclical — rate hikes create buying opportunities while rate cuts can lead to bidding wars in competitive markets like Toronto, Vancouver, and Ontario's Greater Golden Horseshoe.",
  },
  {
    q: "When is the next Bank of Canada rate decision?",
    a: "The Bank of Canada announces rate decisions on a fixed schedule of eight dates per year. The countdown timer on this page tracks the next upcoming decision date. Upcoming decisions for 2025 and 2026 are listed on this page with a live countdown so you can stay ahead of potential rate changes that may affect your mortgage or buying decisions.",
  },
];

const GLOSSARY: [string, string][] = [
  ["Overnight Rate (Policy Rate)", "The Bank of Canada's target for the overnight rate is the interest rate at which major financial institutions borrow and lend one-day funds among themselves. It is the primary tool the Bank uses to influence the Canadian economy and control inflation."],
  ["Prime Rate", "The prime rate is the lending rate that major banks offer their most creditworthy customers. It is typically set at the Bank of Canada policy rate plus approximately 2.2%. Variable-rate mortgages, lines of credit, and other floating-rate loans are often priced relative to prime."],
  ["CORRA", "The Canadian Overnight Repo Rate Average (CORRA) is a risk-free benchmark rate that replaced CDOR. It measures the cost of overnight borrowing between financial institutions using repurchase agreements. CORRA is used to price variable-rate mortgages and other financial products."],
  ["OSFI Stress Test Rate", "The Office of the Superintendent of Financial Institutions (OSFI) requires borrowers to qualify at the higher of their contract rate plus 2%, or 5.25%. This stress test ensures borrowers can afford their mortgage payments even if rates rise significantly."],
  ["Variable vs. Fixed Mortgage", "A variable-rate mortgage fluctuates with the prime rate, meaning payments can change when the Bank of Canada adjusts rates. A fixed-rate mortgage locks in an interest rate for the term (typically 1 to 5 years), providing payment stability regardless of BoC rate changes."],
  ["5-Year Government Bond Yield", "The yield on Government of Canada 5-year bonds is a key benchmark that influences fixed mortgage rates. When bond yields rise, fixed mortgage rates tend to follow. Lenders use bond yields to determine the cost of funding fixed-rate mortgages."],
];

const IMPACT: [string, string, string, string][] = [
  ["-0.50%", "-$131/mo", "-$196/mo", "-$261/mo"],
  ["-0.25%", "-$65/mo", "-$97/mo", "-$130/mo"],
  ["-0.10%", "-$26/mo", "-$39/mo", "-$52/mo"],
  ["+0.10%", "+$26/mo", "+$39/mo", "+$52/mo"],
  ["+0.25%", "+$65/mo", "+$97/mo", "+$130/mo"],
  ["+0.50%", "+$131/mo", "+$196/mo", "+$261/mo"],
  ["+0.75%", "+$197/mo", "+$295/mo", "+$394/mo"],
  ["+1.00%", "+$264/mo", "+$396/mo", "+$528/mo"],
];

const INFO_BLOCKS: [string, string][] = [
  ["How BoC Monetary Policy Decisions Are Made", "The Bank of Canada sets interest rates as part of its monetary policy to keep inflation stable and support sustainable economic growth. By adjusting its key policy rate, the Bank influences how much it costs for banks to borrow money, which then affects interest rates across the economy — including mortgage rates offered to consumers."],
  ["Historical Trend of Bank of Canada Policy Rate", "Looking at the Bank of Canada's rate history provides valuable insight into long-term economic trends. Rate cycles typically reflect inflation pressures, economic slowdowns, or periods of growth. Reviewing past rate movements can help homeowners and investors better prepare for future changes. Use the interactive chart above to explore historical rate data across different time periods."],
  ["Scheduled Policy Rate Announcement Dates", "The Bank of Canada announces its policy rate decisions on a fixed schedule of eight dates per year. These scheduled announcements are closely watched by financial markets, economists, and real estate professionals. The countdown timer on this page tracks the next upcoming rate decision date so you can stay ahead of potential changes that may affect your mortgage or buying decisions."],
  ["The Overnight Rate: What It Means for Borrowing Costs", "At the center of monetary policy is the overnight lending rate. This is the interest rate that major financial institutions use to lend money to each other for one day. The Bank of Canada sets a target for this rate, and most short-term interest rates — including variable mortgage rates — move in response to changes in it. When the overnight rate rises, borrowing becomes more expensive; when it falls, credit becomes cheaper and more accessible."],
  ["Impact of Policy Rate on Mortgage Payments", "When the Bank of Canada raises or lowers its key rate, mortgage rates often move in the same direction. Variable-rate mortgages are usually affected almost immediately, while fixed mortgage rates tend to react to changes in bond yields and market expectations. Even small rate changes can significantly impact monthly payments and buying power. A 0.25% rate increase on a $500,000 mortgage can add over $65 per month to your payment."],
  ["Impact of Interest Rates on the Canadian Real Estate Market", "Interest rate changes influence housing demand, home prices, and market activity across Canada. Higher rates can reduce affordability and slow buyer activity, while lower rates often increase demand and competition among buyers. Understanding these trends helps buyers time their purchases and sellers price their homes more strategically. The relationship between interest rates and real estate is cyclical — periods of low rates typically see increased housing demand and rising prices, while rate hikes tend to cool the market and create opportunities for buyers with secure financing. Whether you are a first-time homebuyer, a seasoned investor, or looking to refinance, tracking Bank of Canada rate decisions is essential for making well-informed real estate decisions."],
];

export default async function BocRatesGuidePage() {
  const settings = await getSettings();
  const logo = await getLogo(settings);
  const ads = (settings.ads ?? {}) as Record<string, any>;
  const showAd = ads.boc_ad_enabled === true && typeof ads.grid_ad_code === "string" && ads.grid_ad_code.includes("data-ad-client");

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.getsetsold.ca" },
      { "@type": "ListItem", position: 2, name: "Bank of Canada Interest Rate Tracker", item: "https://www.getsetsold.ca/bank-of-canada-rates-guide" },
    ],
  };

  return (
    <div className="min-h-screen bg-ground text-ink" style={themeVars(settings)}>
      {themeFontHref(settings) ? <link rel="stylesheet" href={themeFontHref(settings)} /> : null}
      <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <SiteHeader settings={settings} logo={logo} />
      <main className="mx-auto max-w-6xl px-5 pb-16">
        <nav className="pt-6 text-[13px] text-muted" aria-label="Breadcrumb">
          <a href="/" className="hover:underline">Home</a> / <span>Bank of Canada Rate Tracker</span>
        </nav>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">Bank of Canada Rate Tracker</h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted">
          Live BoC policy rate, prime rate, CORRA &amp; mortgage rates from Canada&apos;s Big 5 banks —
          with historical trends, decision countdown &amp; what it means for real estate.
        </p>

        <BocTracker />
        {showAd && <BocAdSlot adCode={ads.grid_ad_code} />}

        <div className="mb-5 mt-10 flex flex-col gap-3">
          <div className="text-sm font-semibold uppercase tracking-wide text-accent">Guide</div>
          <h2 className="text-[26px] font-bold leading-tight tracking-tight text-ink">Current Bank of Canada Policy Interest Rate &amp; Real Estate Implications</h2>
          <div className="h-px w-full border-t border-line" />
          <p className="text-[15px] font-medium leading-relaxed text-muted">How the key policy rate shapes borrowing costs and housing affordability</p>
        </div>
        <article className="rounded-lg border border-line bg-white p-6 shadow-sm">
          <p className="text-[14px] leading-7 text-muted">
            The Bank of Canada Interest Rate, also known as the Key Policy Rate, plays a major role in
            shaping Canada&apos;s economy and real estate market. Changes to this rate directly influence
            mortgage interest rates, borrowing costs, and housing affordability. Understanding how the Bank
            of Canada sets rates can help home buyers, sellers, and investors make informed real estate decisions.
          </p>
        </article>

        {/* Info blocks */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {INFO_BLOCKS.map(([title, body], i) => (
            <article
              key={title}
              className={`rounded-lg border border-line bg-white p-5 shadow-sm ${i === INFO_BLOCKS.length - 1 ? "md:col-span-2" : ""}`}
            >
              <h3 className="mb-2 text-[13px] font-semibold text-ink">{title}</h3>
              <p className="text-[14px] leading-7 text-muted">{body}</p>
            </article>
          ))}
        </div>

        <div className="mb-5 mt-10 flex flex-col gap-3">
          <div className="text-sm font-semibold uppercase tracking-wide text-accent">Calculator</div>
          <h2 className="text-[26px] font-bold leading-tight tracking-tight text-ink">Rate Change Impact on Mortgage Payments</h2>
          <div className="h-px w-full border-t border-line" />
          <p className="text-[15px] font-medium leading-relaxed text-muted">Estimated monthly payment change based on rate increase or decrease (25-year amortization)</p>
        </div>
        <article className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr>
                  <th className="border-b-2 border-primary bg-blue-50/60 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-primary">Rate Change</th>
                  <th className="border-b-2 border-primary bg-blue-50/60 px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-primary">$500,000 Mortgage</th>
                  <th className="border-b-2 border-primary bg-blue-50/60 px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-primary">$750,000 Mortgage</th>
                  <th className="border-b-2 border-primary bg-blue-50/60 px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-primary">$1,000,000 Mortgage</th>
                </tr>
              </thead>
              <tbody>
                {IMPACT.map(([chg, a, b, c]) => {
                  const up = chg.startsWith("+");
                  return (
                    <tr key={chg} className="hover:bg-soft">
                      <td className="border-b border-neutral-100 px-3 py-2.5 font-semibold text-ink">{chg}</td>
                      {[a, b, c].map((v) => (
                        <td key={v} className={`border-b border-neutral-100 px-3 py-2.5 text-center font-semibold ${up ? "text-red-600" : "text-emerald-600"}`}>{v}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[10px] italic text-muted">
            * Estimates are approximate and based on standard variable-rate mortgage calculations with 25-year amortization. Actual amounts may vary by lender and mortgage terms.
          </p>
        </article>

        <div className="mb-5 mt-10 flex flex-col gap-3">
          <div className="text-sm font-semibold uppercase tracking-wide text-accent">Definitions</div>
          <h2 className="text-[26px] font-bold leading-tight tracking-tight text-ink">Interest Rate Glossary</h2>
          <div className="h-px w-full border-t border-line" />
          <p className="text-[15px] font-medium leading-relaxed text-muted">Key terms related to Bank of Canada rates and mortgage financing</p>
        </div>
        <article className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {GLOSSARY.map(([term, def]) => (
              <div key={term} className="rounded-lg border border-line border-l-4 border-l-primary bg-soft px-4 py-3.5">
                <div className="mb-1 text-[12px] font-bold text-primary">{term}</div>
                <div className="text-[11px] leading-6 text-muted">{def}</div>
              </div>
            ))}
          </div>
        </article>

        <div className="mb-5 mt-10 flex flex-col gap-3">
          <div className="text-sm font-semibold uppercase tracking-wide text-accent">FAQ</div>
          <h2 className="text-[26px] font-bold leading-tight tracking-tight text-ink">Frequently Asked Questions</h2>
          <div className="h-px w-full border-t border-line" />
          <p className="text-[15px] font-medium leading-relaxed text-muted">Answers to common questions about the Bank of Canada policy rate</p>
        </div>
        <article className="rounded-lg border border-line bg-white px-6 py-2 shadow-sm">
          {FAQS.map((f, i) => (
            <details key={f.q} className={`py-3.5 ${i > 0 ? "border-t border-neutral-100" : ""}`} open={i === 0}>
              <summary className="cursor-pointer font-semibold text-primary">{f.q}</summary>
              <p className="mt-2 text-[14px] text-muted">{f.a}</p>
            </details>
          ))}
        </article>

        {/* Data source */}
        <article className="mb-2 mt-10 rounded-lg border border-line bg-white p-5 shadow-sm">
          <h3 className="mb-2 text-[14px] font-semibold text-ink">Data Source</h3>
          <p className="text-[12px] leading-7 text-muted">
            Rates sourced from the{" "}
            <a href="https://www.bankofcanada.ca" target="_blank" rel="noopener" className="font-medium text-primary">
              Bank of Canada
            </a>{" "}
            Valet API. Historical data may include interpolated values. Rate decision dates are based on
            BoC&apos;s published schedule. For informational purposes only. Not financial advice.
          </p>
        </article>
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
