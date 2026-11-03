import type { Metadata } from "next";
import { getSettings, getLogo } from "@/lib/cms";
import { getSoldHistory, shuffleRows } from "@/lib/soldHistory";
import { themeFontHref, themeVars, themeIconOverrideCSS } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter, MobileCtaBar } from "@/components/site/SiteFooter";
import { ListingCardShell } from "@/components/listings/ListingCardShell";
import { Pagination } from "@/components/listings/Pagination";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sold, Leased & Purchased",
  alternates: { canonical: "/sold-history" },
};

const STATUS_MAP: Record<string, { label: string; tone: "green" | "blue" | "purple" | "red" }> = {
  sold: { label: "Sold", tone: "red" },
  leased: { label: "Leased", tone: "blue" },
  purchased: { label: "Purchased", tone: "green" },
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
      badgeStyle="ribbon"
      price={priceLabel}
      address={row.address}
      beds={row.bed}
      baths={row.bath}
      area={row.sqft ? `${row.sqft.toLocaleString()} sqft` : null}
    />
  );
}

export default async function SoldHistoryPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams;
  const [settings, allRows] = await Promise.all([getSettings(), getSoldHistory()]);
  const logo = await getLogo(settings);
  const themeVars_ = themeVars(settings);
  // Random display order (fresh daily, stable within the day so ?page= stays
  // consistent); no status filter tabs — a thin category looks bad on its own.
  const rows = shuffleRows(allRows);
  // Same paging as the listings browser: 12 per page, ?page= in the URL.
  const perPage = 12;
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const page = Math.min(Math.max(1, Number(pageParam) || 1), totalPages);
  const pageRows = rows.slice((page - 1) * perPage, page * perPage);
  const hrefFor = (p: number) => (p > 1 ? `/sold-history?page=${p}` : "/sold-history");

  return (
    <div style={themeVars_} className="bg-ground text-ink">
      <link rel="stylesheet" href={themeFontHref(settings)} />
      {themeIconOverrideCSS(settings) ? <style dangerouslySetInnerHTML={{ __html: themeIconOverrideCSS(settings) }} /> : null}
      <SiteHeader settings={settings} logo={logo} />
      <main className="mx-auto w-full max-w-7xl px-5 py-14 md:px-10">
        <div className="mb-8 flex flex-col gap-3">
          <h1 className="font-display font-bold text-[30px] leading-[1.15] tracking-tight md:text-[28px] md:leading-[1.2]">Sold, Leased &amp; Purchased</h1>
          <p className="max-w-xl text-lg text-muted">A record of homes we've helped sell, lease, and buy.</p>
        </div>

        {rows.length ? (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {pageRows.map((r) => <Card key={r.id} row={r} />)}
            </div>
            <div className="mt-10">
              <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
            </div>
          </>
        ) : <p className="text-muted">No records yet.</p>}
      </main>
      <SiteFooter settings={settings} />
      <MobileCtaBar settings={settings} />
    </div>
  );
}
