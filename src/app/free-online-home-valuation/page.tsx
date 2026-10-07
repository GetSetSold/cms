import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { getSettings, getLogo } from "@/lib/cms";
import { themeVars } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { EvaluationFlow } from "@/components/evaluation/EvaluationFlow";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Free Home Valuation — What's Your Home Worth? | GetSetSold.ca",
  description:
    "Get a free preliminary home valuation based on similar active listings near you and current market direction. No obligation — the real number comes from an in-person walkthrough.",
  alternates: { canonical: "https://www.getsetsold.ca/free-online-home-valuation" },
};

export default async function HomeValuationPage() {
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
        <EvaluationFlow
          config={{
            heading: cfg.heading ?? "What's your home really worth?",
            subheading:
              cfg.subheading ??
              "A preliminary estimate from what's happening around you right now — active listings, market direction, and your home's details.",
            disclaimer:
              cfg.disclaimer ??
              "This is an automated preliminary estimate based on similar homes currently listed nearby and the HPI market direction — not an appraisal and not a formal comparative market analysis. The real valuation happens in person.",
            bookingUrl: cfg.booking_url ?? "https://booking.getsetsold.ca",
            virtualCmaUrl: cfg.virtual_cma_url ?? "",
          }}
        />
      </main>
      <SiteFooter settings={settings} />
    </div>
  );
}
