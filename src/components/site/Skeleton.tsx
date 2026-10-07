/**
 * Skeleton loading placeholders — monochrome shimmer matching the site.
 * Pure CSS (no JS, no network). Card radius/shadow follow Shape settings.
 * Shimmer uses transform-only animation (GPU-friendly) and respects
 * prefers-reduced-motion.
 */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`sk-shimmer relative overflow-hidden bg-[#ececee] ${className}`} />;
}

/** Mirrors ListingCardShell layout pixel-for-pixel: photo block with badge /
 *  pill placeholders, price + heart row, specs, divider, MLS line. */
export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line bg-white shadow-[var(--shadow-card)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#ececee]">
        <div className="sk-shimmer absolute inset-0" aria-hidden />
        {/* badge / pills placeholders */}
        <div className="absolute bottom-3 left-3 h-[22px] w-[72px] rounded-[var(--radius-label)] bg-[#dcdce0]" aria-hidden />
        <div className="absolute bottom-3 right-3 h-[22px] w-[64px] rounded-[var(--radius-label)] bg-[#dcdce0]" aria-hidden />
        <div className="absolute right-3 top-3 h-[22px] w-[52px] rounded-[var(--radius-label)] bg-[#dcdce0]" aria-hidden />
      </div>
      <div className="p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <Skeleton className="h-[26px] w-[45%] rounded-md" />
          <div className="h-7 w-7 rounded-full bg-[#ececee]" aria-hidden />
        </div>
        <Skeleton className="mb-3 h-[14px] w-[80%] rounded" />
        <div className="mx-[-16px] mb-3 h-px bg-line" aria-hidden />
        <Skeleton className="h-[12px] w-[60%] rounded" />
      </div>
    </div>
  );
}

/** Grid of skeleton cards for listing results. */
export function SkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/** Placeholder for the city stats / editorial / FAQ blocks. */
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line bg-white p-6 shadow-[var(--shadow-card)] ${className}`}>
      <Skeleton className="mb-3 h-[22px] w-[40%] rounded-md" />
      <Skeleton className="mb-2 h-[14px] w-full rounded" />
      <Skeleton className="mb-2 h-[14px] w-[90%] rounded" />
      <Skeleton className="h-[14px] w-[70%] rounded" />
    </div>
  );
}
