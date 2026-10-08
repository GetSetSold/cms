/** Loading state for lead detail — shows immediately on client-side navigation. */
export default function Loading() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-[#111]" aria-label="Loading" />
        <p className="text-sm text-muted">Loading lead…</p>
      </div>
    </div>
  );
}
