"use client";
import { useEffect, useState } from "react";
import { ValuationReportView } from "@/components/valuations/ValuationReportView";

export default function ReportDetail({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  const [report, setReport] = useState<any>(null);
  const [leadName, setLeadName] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { params.then((p) => setId(p.id)); }, [params]);
  useEffect(() => {
    if (!id) return;
    fetch(`/api/valuation-reports/${id}`).then((r) => r.json()).then(async (j) => {
      if (!j.report) return;
      setReport(j.report);
      if (j.report.share_token && !j.report.share_revoked) {
        setShareUrl(`${window.location.origin}/shared/valuation/${j.report.share_token}`);
      }
      if (j.report.lead_id) {
        const l = await fetch(`/api/admin/leads/${j.report.lead_id}`).then((r) => r.json()).catch(() => null);
        const lead = l?.lead;
        if (lead) setLeadName(`${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim());
      }
    });
  }, [id]);

  async function share() {
    setBusy(true);
    try {
      const r = await fetch(`/api/valuation-reports/${id}/share`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expires_in_days: 30 }),
      });
      const j = await r.json();
      if (j.url) { setShareUrl(j.url); setReport({ ...report, share_token: j.token, share_revoked: false }); }
    } finally { setBusy(false); }
  }

  async function revoke() {
    if (!confirm("Revoke this share link? It will stop working immediately.")) return;
    setBusy(true);
    try {
      await fetch(`/api/valuation-reports/${id}/revoke`, { method: "POST" });
      setShareUrl(""); setReport({ ...report, share_revoked: true, share_token: null });
    } finally { setBusy(false); }
  }

  if (!report) return <div className="p-6">Loading…</div>;

  return (
    <div>
      <div className="cma-no-print flex items-center gap-3 p-4 border-b border-line bg-white sticky top-0 z-10">
        <button onClick={() => window.print()} className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">Print / PDF</button>
        {!shareUrl ? (
          <button onClick={share} disabled={busy} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold">Create share link</button>
        ) : (
          <>
            <input readOnly value={shareUrl} className="flex-1 rounded-lg border border-line px-3 py-2 text-sm" onFocus={(e) => e.target.select()} />
            <button onClick={() => navigator.clipboard.writeText(shareUrl)} className="rounded-lg border border-line px-3 py-2 text-sm">Copy</button>
            <button onClick={revoke} disabled={busy} className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600">Revoke</button>
          </>
        )}
        <span className="text-xs text-muted ml-auto">{report.view_count ?? 0} views</span>
      </div>
      <ValuationReportView report={report} leadName={leadName} />
    </div>
  );
}
