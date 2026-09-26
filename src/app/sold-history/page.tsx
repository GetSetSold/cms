import type { Metadata } from "next";
import { getSettings, getLogo } from "@/lib/cms";
import { getSoldHistory } from "@/lib/soldHistory";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sold, Leased & Purchased",
  alternates: { canonical: "/sold-history" },
};

const STATUS_STYLE: Record<string, string> = {
  sold: "bg-[#1B8A5A]",
  leased: "bg-[#2B3A8C]",
  purchased: "bg-primary",
};

function Card({ row }: { row: Awaited<ReturnType<typeof getSoldHistory>>[number] }) {
  const priceLabel = row.status === "leased"
    ? row.price ? `$${row.price.toLocaleString()} / mo` : null
    : row.price ? `$${row.price.toLocaleString()}` : null;

  const inner = (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_16px_rgba(20,20,43,0.06)]">
      <div className="relative">
        {row.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.image_url} alt={row.address} className="aspect-[3/2] w-full object-cover" />
        ) : (
          <div className="aspect-[3/2] w-full bg-soft" />
        )}
        <span className={`absolute left-3.5 top-3.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white ${STATUS_STYLE[row.status]}`}>{row.status}</span>
        <span className="absolute right-3.5 top-3.5 rounded-full bg-ink/60 px-3 py-1 text-[11px] font-medium text-white backdrop-blur">
          Closed {new Date(row.closed_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 px-5 py-4">
        {priceLabel ? <div className="text-xl font-extrabold">{priceLabel}</div> : null}
        {row.listed_price && row.price && row.listed_price !== row.price ? (
          <div className="text-xs text-muted">Listed at ${row.listed_price.toLocaleString()}</div>
        ) : null}
        <div className="text-[15px] text-muted">{row.address}</div>
        {row.bed || row.bath || row.sqft ? (
          <div className="flex gap-3.5 pt-1 text-[13px] text-muted">
            {row.bed ? <span>{row.bed} bd</span> : null}
            {row.bath ? <span>{row.bath} ba</span> : null}
            {row.sqft ? <span>{row.sqft.toLocaleString()} sqft</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  );

  return row.link ? (
    <a href={row.link.startsWith("http") ? row.link : `https://${row.link}`} target="_blank" rel="noopener noreferrer">{inner}</a>
  ) : inner;
}

export default async function SoldHistoryPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const [settings, rows, allRows] = await Promise.all([getSettings(), getSoldHistory(status), getSoldHistory()]);
  const logo = await getLogo(settings);
  const themeVars_ = themeVars(settings);
  const counts = {
    sold: allRows.filter((r) => r.status === "sold").length,
    leased: allRows.filter((r) => r.status === "leased").length,
    purchased: allRows.filter((r) => r.status === "purchased").length,
  };

  return (
    <div style={themeVars_} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      <SiteHeader settings={settings} logo={logo} />
      <main className="mx-auto w-full max-w-7xl px-5 py-14 md:px-10">
        <div className="mb-8 flex flex-col gap-3">
          <h1 className="font-display text-4xl font-extrabold md:text-5xl">Sold, Leased &amp; Purchased</h1>
          <p className="max-w-xl text-lg text-muted">A record of homes we've helped sell, lease, and buy.</p>
        </div>

        <div className="mb-10 flex flex-wrap gap-2.5">
          <a href="/sold-history" className={`flex h-10 items-center rounded-full px-4.5 text-sm font-medium ${!status ? "bg-primary text-white" : "border border-line bg-white"}`}>All ({allRows.length})</a>
          <a href="/sold-history?status=sold" className={`flex h-10 items-center rounded-full px-4.5 text-sm font-medium ${status === "sold" ? "bg-primary text-white" : "border border-line bg-white"}`}>Sold ({counts.sold})</a>
          <a href="/sold-history?status=leased" className={`flex h-10 items-center rounded-full px-4.5 text-sm font-medium ${status === "leased" ? "bg-primary text-white" : "border border-line bg-white"}`}>Leased ({counts.leased})</a>
          <a href="/sold-history?status=purchased" className={`flex h-10 items-center rounded-full px-4.5 text-sm font-medium ${status === "purchased" ? "bg-primary text-white" : "border border-line bg-white"}`}>Purchased ({counts.purchased})</a>
        </div>

        {rows.length ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => <Card key={r.id} row={r} />)}
          </div>
        ) : <p className="text-muted">No records yet.</p>}
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
