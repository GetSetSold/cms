"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

/** Valuation reports linked to a lead — shown in the lead's Forms tab. */
export function LeadValuations({ leadId }: { leadId: string }) {
  const [reports, setReports] = useState<any[]>([]);
  useEffect(() => {
    fetch(`/api/valuation-reports?lead_id=${leadId}`).then((r) => r.json()).then((j) => setReports(j.reports ?? []));
  }, [leadId]);
  const money = (n: number | null) => (n ? "$" + n.toLocaleString() : "—");

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Valuation Reports ({reports.length})</h3>
        <Link href={`/admin/valuations/new?lead_id=${leadId}`}
          className="rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white">+ New</Link>
      </div>
      {!reports.length ? (
        <p className="text-sm text-muted">No valuation reports for this lead yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {reports.map((r) => (
            <Link key={r.id} href={`/admin/valuations/${r.id}`}
              className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm hover:bg-gray-50">
              <span>{r.address}{r.city ? `, ${r.city}` : ""}</span>
              <span className="font-semibold">{money(r.recommended_price)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
