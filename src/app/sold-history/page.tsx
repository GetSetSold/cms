import type { Metadata } from "next";
import { getSettings, getLogo } from "@/lib/cms";
import { getSoldHistory } from "@/lib/soldHistory";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { ListingCardShell } from "@/components/listings/ListingCardShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sold, Leased & Purchased",
  alternates: { canonical: "/sold-history" },
};

const STATUS_MAP: Record<string, { label: string; tone: "green" | "blue" | "purple" }> = {
  sold: { label: "Sold", tone: "green" },
  leased: { label: "Leased", tone: "blue" },
  purchased: { label: "Purchased", tone: "purple" },
};

function Card({ row }: { row: Awaited<ReturnType<typeof getSoldHistory>>[number] }) {
  const priceLabel = row.status === "leased"
    ? row.price ? `$${row.price.toLocaleString()} / mo` : "Call for price"
    : row.price ? `$${row.price.toLocaleString()}` : "Call for price";
  const status = STATUS_MAP[row.status] ?? { label: row.status, tone: "purple" as const };

  return (
    <ListingCardShell
      href={row.link ? (row.link.startsWith("http") ? row.link : `https://${row.link}`) : undefined}
      image={row.image_url}
      statusLabel={status.label}
      statusTone={status.tone}
      price={priceLabel}
      address={row.address}
      beds={row.bed}
      baths={row.bath}
      area={row.sqft ? `${row.sqft.toLocaleString()} sqft` : null}
    />
  );
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
