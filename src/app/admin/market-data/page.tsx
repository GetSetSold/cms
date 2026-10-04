import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MarketDataUploader } from "@/components/admin/MarketDataUploader";

export const dynamic = "force-dynamic";

export default async function MarketDataPage() {
  await requireStaff();
  const supabase = await createClient();
  const { data, count } = await supabase.from("hpi_markets").select("slug,name,last_updated,updated_at", { count: "exact" }).order("name");
  const markets = (data ?? []) as { slug: string; name: string; last_updated: string | null; updated_at: string }[];

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-bold">Market Data (HPI)</h1>
      <p className="mt-1 text-sm text-muted">
        Upload your <code className="rounded bg-soft px-1">ontario-hpi-data.json</code> (converted from the CREA Excel)
        to refresh all 28 Ontario markets. The trends pages, neighbourhood Market Pulse sections, and
        insights update immediately.
      </p>

      <div className="mt-6">
        <MarketDataUploader />
      </div>

      <h2 className="mt-8 text-base font-semibold">Current data ({count ?? 0} markets)</h2>
      {markets.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No HPI data uploaded yet.</p>
      ) : (
        <div className="mt-3 overflow-hidden rounded-xl border border-line">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-soft text-left">
                <th className="px-4 py-2 text-xs uppercase tracking-wider text-muted">Market</th>
                <th className="px-4 py-2 text-xs uppercase tracking-wider text-muted">Data month</th>
                <th className="px-4 py-2 text-xs uppercase tracking-wider text-muted">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((m) => (
                <tr key={m.slug} className="border-b border-line last:border-0">
                  <td className="px-4 py-2">{m.name}</td>
                  <td className="px-4 py-2 text-muted">{m.last_updated ?? "—"}</td>
                  <td className="px-4 py-2 text-muted">{new Date(m.updated_at).toLocaleDateString("en-CA")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
