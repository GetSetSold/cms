"use client";
import { useRef, useState, type ReactNode } from "react";
import { Pagination } from "./Pagination";

/** Client pager for the sold-history block: the server renders one grid per
 *  12-row chunk and passes them in; this shows one at a time with the same
 *  pager look as the listings. Pages arrive as server-rendered nodes, so the
 *  cards themselves stay server-rendered — blocks can't read ?page= from the
 *  URL, which is why paging here is client-side instead of URL-driven. */
export function SoldHistoryPager({ pages }: { pages: ReactNode[] }) {
  const [page, setPage] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);
  const totalPages = pages.length;
  const go = (p: number) => {
    setPage(Math.min(Math.max(1, p), totalPages));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <div ref={topRef}>
      {pages[page - 1]}
      <div className="mt-10">
        <Pagination page={page} totalPages={totalPages} onPageChange={go} />
      </div>
    </div>
  );
}
