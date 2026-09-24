"use client";

export function PerPageControl({
  basePath, currentParams, perRow, perPage,
}: {
  basePath: string;
  currentParams: Record<string, string>;
  perRow: number;
  perPage: number;
}) {
  function go(patch: Record<string, string>) {
    const merged = { ...currentParams, ...patch };
    delete merged.page; // changing density resets pagination
    const qs = new URLSearchParams(merged).toString();
    window.location.href = `${basePath}${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <span>Show</span>
      <select value={perRow} onChange={(e) => go({ perRow: e.target.value })} className="h-9 rounded-lg border border-line bg-white px-2 text-ink">
        {[2, 3, 4].map((n) => <option key={n} value={n}>{n} per row</option>)}
      </select>
      <select value={perPage} onChange={(e) => go({ perPage: e.target.value })} className="h-9 rounded-lg border border-line bg-white px-2 text-ink">
        {[8, 12, 24, 48].map((n) => <option key={n} value={n}>{n} per page</option>)}
      </select>
    </div>
  );
}
