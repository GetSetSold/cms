import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/cms";
import { ValuationReportView } from "@/components/valuations/ValuationReportView";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const supabase = await createClient();
  const { data: report } = await supabase
    .from("valuation_reports")
    .select("address,city")
    .eq("share_token", token)
    .eq("share_revoked", false)
    .maybeSingle();
  let title = "Market Analysis";
  if (report) {
    const addr = `${(report as any).address ?? ""}${(report as any).city ? `, ${(report as any).city}` : ""}`.trim();
    if (addr) title = `Market Analysis — ${addr}`;
  }
  try {
    const settings = await getSettings();
    const suffix = (settings as any)?.seo_defaults?.title_suffix?.trim();
    if (suffix && !title.endsWith(suffix)) title = `${title} ${suffix}`;
  } catch { /* keep title */ }
  return { title, robots: { index: false, follow: false } };
}

export default async function SharedValuationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  // RLS: public can only read unexpired, non-revoked shares.
  const { data: report } = await supabase
    .from("valuation_reports")
    .select("*")
    .eq("share_token", token)
    .eq("share_revoked", false)
    .maybeSingle();
  if (!report || (report.share_expires_at && new Date(report.share_expires_at) < new Date())) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold mb-2">This link has expired</h1>
          <p className="text-sm text-gray-500">Please contact Rohit Sharma at 416-605-7488 for an updated market analysis.</p>
        </div>
      </div>
    );
  }

  // Bump view count (fire-and-forget).
  supabase.from("valuation_reports").update({ view_count: (report.view_count ?? 0) + 1 }).eq("id", report.id).then(() => {});

  let leadName = "";
  if (report.lead_id) {
    const { data: lead } = await supabase.from("leads").select("first_name,last_name").eq("id", report.lead_id).maybeSingle();
    if (lead) leadName = `${(lead as any).first_name ?? ""} ${(lead as any).last_name ?? ""}`.trim();
  }

  const { data: settings } = await supabase.from("site_settings").select("doc_branding").eq("id", 1).maybeSingle();
  const branding = (settings as any)?.doc_branding ?? null;

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <ValuationReportView report={report} leadName={leadName} branding={branding} />
    </div>
  );
}
