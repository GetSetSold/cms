import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Suspense } from "react";
import { getSettings, getLogo } from "@/lib/cms";
import { themeVars } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { EvaluationFlow } from "@/components/evaluation/EvaluationFlow";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "What Will It Sell For? — Buyer Price Check | GetSetSold.ca",
  description:
    "Check what a home will really sell for — live asking prices measured against the HPI benchmark. Free buyer price check, no obligation.",
  alternates: { canonical: "https://www.getsetsold.ca/what-will-it-sell-for" },
};

export default async function BuyerPriceCheckPage() {
  const settings = await getSettings();
  const logo = await getLogo(settings);
  const cfg = settings.home_evaluation ?? {};
  if (cfg.enabled === false) notFound();

  return (
    <div
      className="min-h-screen"
      style={
        {
          // Runtime branding (Shape tokens, header/footer theme) + this page's fixed palette
          ...themeVars(settings),
          "--hev-primary": "#111111",
          "--hev-accent": "#0066cc",
          "--hev-text": "#333333",
          "--hev-bg": "#f7f7f7",
          background: "#f7f7f7",
          color: "#333333",
          overflowX: "clip",
        } as CSSProperties
      }
    >
      <SiteHeader settings={settings} logo={logo} />
      <main>
        <Suspense>
          <EvaluationFlow
            mode="buy"
            config={{
              heading: cfg.buyer_heading ?? "What will it actually sell for?",
              subheading:
                cfg.buyer_subheading ??
                "A preliminary read on what homes like the one you're eyeing really transact at — live asking prices measured against the HPI benchmark.",
              disclaimer:
                cfg.disclaimer ??
                "This is an automated preliminary estimate based on similar homes currently listed nearby and the HPI market direction — not an appraisal and not a formal comparative market analysis. The real valuation happens in person.",
              bookingUrl: cfg.booking_url ?? "https://booking.getsetsold.ca",
              virtualCmaUrl: cfg.virtual_cma_url ?? "",
            }}
          />
        </Suspense>
      </main>
      <SiteFooter settings={settings} />
    </div>
  );
}
