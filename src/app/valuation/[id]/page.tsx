import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { getSettings, getLogo } from "@/lib/cms";
import { themeVars } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import {
  ValuationResultView,
  type ValuationSnapshot,
} from "@/components/evaluation/ValuationResultView";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Shared home valuation | GetSetSold.ca",
  description: "A preliminary home valuation shared from GetSetSold.ca — based on similar active listings and HPI market direction.",
  robots: { index: false, follow: false },
};

function rowToSnapshot(row: any, cfg: any): ValuationSnapshot {
  const d = row.details ?? {};
  return {
    addressLabel: row.address,
    city: row.city,
    lat: row.lat,
    lng: row.lng,
    propertyType: d.propertyType ?? "Detached",
    condition: d.condition ?? "Good — well maintained",
    beds: String(d.beds ?? "—"),
    baths: String(d.baths ?? "—"),
    sqft: d.sqft ? String(d.sqft) : "",
    renovations: Array.isArray(d.renovations) ? d.renovations : [],
    estimate: {
      low: row.estimate_low,
      high: row.estimate_high,
      mid: row.estimate_mid,
      median: row.estimate_mid,
      count: Array.isArray(row.listings) ? row.listings.length : 0,
    },
    listings: Array.isArray(row.listings) ? row.listings : [],
    hpi: row.hpi && typeof row.hpi === "object" && row.hpi.label ? row.hpi : null,
    radiusKm: Number(row.radius_km ?? 10),
    rangePct: Number(row.range_pct ?? 5),
    dataAsOf: row.data_as_of ?? new Date().toISOString().slice(0, 10),
    disclaimer:
      cfg.disclaimer ??
      "This is an automated preliminary estimate based on similar homes currently listed nearby and the HPI market direction — not an appraisal and not a formal comparative market analysis. The real valuation happens in person.",
    bookingUrl: cfg.booking_url ?? "https://booking.getsetsold.ca",
  };
}

export default async function SharedValuationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("valuations")
    .select("*")
    .eq("public_id", id)
    .maybeSingle();
  if (!data) notFound();

  const settings = await getSettings();
  const logo = await getLogo(settings);
  const cfg = (settings as any).home_evaluation ?? {};
  const snapshot = rowToSnapshot(data, cfg);

  return (
    <div
      className="min-h-screen"
      style={
        {
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
        <section className="mx-auto max-w-7xl scroll-mt-24 px-5 py-14">
          <ValuationResultView snapshot={snapshot} />

          <div className="mt-12 rounded-[var(--radius-lg)] bg-[#111111] p-7 text-center text-white shadow-[var(--shadow-card)] md:p-11">
            <span className="mb-3 text-[12px] font-bold uppercase tracking-[0.14em] text-white/50">
              Your turn
            </span>
            <h3 className="text-[24px] font-extrabold tracking-tight">What's your home worth?</h3>
            <p className="mx-auto mt-2.5 max-w-md text-[14.5px] leading-relaxed text-white/65">
              This valuation was shared with you. Run your own free preliminary estimate — it takes
              under a minute.
            </p>
            <div className="mx-auto mt-6 grid max-w-md gap-3">
              <a
                href="/free-online-home-valuation"
                className="inline-flex h-12 w-full items-center justify-center rounded-[var(--radius-btn)] bg-white px-6 text-[16px] font-semibold text-[#111111] transition hover:bg-white/90"
              >
                Get my free valuation
              </a>
              <a
                href={snapshot.bookingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 w-full items-center justify-center rounded-[var(--radius-btn)] border border-white/25 px-6 text-[15px] font-semibold text-white transition hover:bg-white/10"
              >
                Book a free in-person valuation
              </a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter settings={settings} />
    </div>
  );
}
