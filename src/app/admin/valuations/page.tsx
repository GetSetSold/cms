import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function ValuationsPage() {
  const { supabase } = await requireStaff(["admin", "editor", "sales"]);
  const { data } = await supabase
    .from("valuation_reports")
    .select("id,address,city,recommended_price,share_token,share_revoked,created_at,leads(first_name,last_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  const fmt = (n: number | null) => (n ? "$" + n.toLocaleString() : "—");

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Valuation Reports</h1>
        <div className="flex gap-2">
          <Link href="/admin/valuations/styles" className="rounded-lg border border-line px-4 py-2 text-sm font-semibold">
            Layout styles
          </Link>
          <Link href="/admin/valuations/new" className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">
            + New report
          </Link>
        </div>
      </div>
      {!data?.length ? (
        <p className="text-muted">No reports yet. Create one to combine active listings + sold comparables into a printable CMA.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((r: any) => (
            <Link key={r.id} href={`/admin/valuations/${r.id}`}
              className="rounded-lg border border-line bg-white p-4 flex items-center justify-between hover:shadow">
              <div>
                <div className="font-semibold">{r.address}{r.city ? `, ${r.city}` : ""}</div>
                <div className="text-sm text-muted">
                  {r.leads ? `${r.leads.first_name ?? ""} ${r.leads.last_name ?? ""}`.trim() + " · " : ""}
                  {new Date(r.created_at).toLocaleDateString()}
                  {r.share_token && !r.share_revoked ? " · 🔗 shared" : ""}
                </div>
              </div>
              <div className="font-bold">{fmt(r.recommended_price)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
