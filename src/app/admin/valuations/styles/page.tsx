import { createClient } from "@/lib/supabase/server";
import { ValuationReportView, type ReportStyle } from "@/components/valuations/ValuationReportView";

const STYLES: { key: ReportStyle; name: string; blurb: string }[] = [
  { key: "cards", name: "Style A — Cards", blurb: "White blocks on light grey, bold headers with black underline. Current default." },
  { key: "editorial", name: "Style B — Editorial", blurb: "Magazine look: serif headlines, no boxes, generous whitespace." },
  { key: "compact", name: "Style C — Compact", blurb: "Dense and print-first: smaller type, tighter grids, more per page." },
];

export default async function ValuationStylesPage() {
  const supabase = await createClient();
  const { data: report } = await supabase
    .from("valuation_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!report) return <div className="p-8">No valuation reports yet.</div>;

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-bold">Report layout styles</h1>
      <p className="mt-1 text-sm text-muted">
        Previewing with the latest report ({report.address}). Pick a style — it becomes the default for new reports, print/PDF and shared links.
      </p>
      <div className="mt-6 flex flex-col gap-12">
        {STYLES.map((s) => (
          <section key={s.key} id={`style-${s.key}`} className="scroll-mt-6">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">{s.name}</h2>
                <p className="text-sm text-muted">{s.blurb}</p>
              </div>
              <a href={`#style-${s.key}`} className="text-sm text-primary">Permalink</a>
            </div>
            <div className="overflow-hidden rounded-xl border border-line">
              <ValuationReportView report={report} style={s.key} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
