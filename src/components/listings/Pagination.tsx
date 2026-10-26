import type { ReactNode } from "react";

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

/** One pager item — a link on URL-driven archives, a button when the parent
 *  pages client-side (sold-history block). Same look either way. */
function PageItem({ p, className, disabled, current, hrefFor, onPageChange, children }: {
  p: number; className: string; disabled?: boolean; current?: boolean;
  hrefFor?: (p: number) => string; onPageChange?: (p: number) => void; children: ReactNode;
}) {
  if (onPageChange) {
    return (
      <button type="button" onClick={() => onPageChange(p)} disabled={disabled} aria-current={current ? "page" : undefined} className={className}>
        {children}
      </button>
    );
  }
  return (
    <a href={hrefFor?.(p) ?? "#"} aria-disabled={disabled ? true : undefined} aria-current={current ? "page" : undefined} className={className}>
      {children}
    </a>
  );
}

export function Pagination({ page, totalPages, hrefFor, onPageChange }: {
  page: number; totalPages: number;
  hrefFor?: (p: number) => string;
  /** When set, pages render as buttons calling this instead of links. */
  onPageChange?: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav className="flex items-center justify-center gap-1.5" aria-label="Pagination">
      <PageItem p={Math.max(1, page - 1)} disabled={page === 1} hrefFor={hrefFor} onPageChange={onPageChange}
        className={`flex h-11 w-11 items-center justify-center rounded-[var(--radius-btn)] bg-white ${page === 1 ? "pointer-events-none opacity-40" : "hover:bg-soft"}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 6-6 6 6 6" /></svg>
      </PageItem>
      <div className="flex items-center gap-1 rounded-[var(--radius-btn)] bg-soft/70 p-1.5">
        {pageList(page, totalPages).map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="flex h-9 w-9 items-center justify-center text-sm text-muted">…</span>
          ) : (
            <PageItem key={p} p={p} current={p === page} hrefFor={hrefFor} onPageChange={onPageChange}
              className={`flex h-9 min-w-9 items-center justify-center rounded-[var(--radius-btn)] px-2.5 text-sm font-medium ${p === page ? "bg-primary text-white" : "text-ink hover:bg-white"}`}>
              {p}
            </PageItem>
          ),
        )}
      </div>
      <PageItem p={Math.min(totalPages, page + 1)} disabled={page === totalPages} hrefFor={hrefFor} onPageChange={onPageChange}
        className={`flex h-11 w-11 items-center justify-center rounded-[var(--radius-btn)] bg-white ${page === totalPages ? "pointer-events-none opacity-40" : "hover:bg-soft"}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 6 6 6-6 6" /></svg>
      </PageItem>
    </nav>
  );
}
