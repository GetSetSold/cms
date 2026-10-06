"use client";

/** Est. monthly mortgage payment under the list price. 20% down, 25yr amort, 4.84% (matches affordability calculator default). */
export function PaymentEstimate({ price, listingKey }: { price: number; listingKey: string }) {
  if (!price || price <= 0) return null;
  const principal = price * 0.8;
  const r = 0.0484 / 12;
  const n = 300;
  const m = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const formatted = "$" + Math.round(m).toLocaleString("en-CA");

  return (
    <a
      href={`/calculators/affordability-calculator?mls=${encodeURIComponent(listingKey)}`}
      target="_blank"
      rel="noopener"
      className="group mt-1.5 inline-flex items-center gap-1.5 text-[14px] text-muted hover:text-ink"
    >
      Est. <strong className="text-ink">{formatted}/mo</strong>
      <span className="text-[12px]">· 20% down, 25 yr</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
        <line x1="7" y1="17" x2="17" y2="7" />
        <polyline points="7 7 17 7 17 17" />
      </svg>
    </a>
  );
}
