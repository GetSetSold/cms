function pageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, 2, total - 1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - (sorted[i - 1] as number) > 1) out.push("…");
    out.push(p);
  });
  return out;
}

export function Pagination({ page, totalPages, hrefFor }: { page: number; totalPages: number; hrefFor: (p: number) => string }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="flex items-center justify-center gap-1.5" aria-label="Pagination">
      <a href={hrefFor(Math.max(1, page - 1))} aria-disabled={page === 1}
        className={`flex h-11 w-11 items-center justify-center rounded-full bg-white ${page === 1 ? "pointer-events-none opacity-40" : "hover:bg-soft"}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 6-6 6 6 6" /></svg>
      </a>
      <div className="flex items-center gap-1 rounded-full bg-soft/70 p-1.5">
        {pageList(page, totalPages).map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="flex h-9 w-9 items-center justify-center text-sm text-muted">…</span>
          ) : (
            <a key={p} href={hrefFor(p)} aria-current={p === page ? "page" : undefined}
              className={`flex h-9 min-w-9 items-center justify-center rounded-full px-2.5 text-sm font-medium ${p === page ? "bg-primary text-white" : "text-ink hover:bg-white"}`}>
              {p}
            </a>
          ),
        )}
      </div>
      <a href={hrefFor(Math.min(totalPages, page + 1))} aria-disabled={page === totalPages}
        className={`flex h-11 w-11 items-center justify-center rounded-full bg-white ${page === totalPages ? "pointer-events-none opacity-40" : "hover:bg-soft"}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 6 6 6-6 6" /></svg>
      </a>
    </nav>
  );
}
