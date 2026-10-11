import { formatCashback } from "@/lib/cashback";

/** Unified cashback offer banner — used on project and model pages. */
export function PreconOfferBanner({ cashback }: { cashback: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border-2 border-dashed border-primary bg-[#f2f7ff] p-6 md:p-7">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Buyer Cashback Offer</div>
        <div className="font-display mt-1.5 text-xl font-extrabold md:text-2xl">
          Up to {formatCashback(cashback)} Cashback — Exclusive Buyer Perk
          <br />
          <span className="text-[16px] font-semibold md:text-[18px]">when you buy with us</span>
        </div>
        <div className="mt-1 text-sm text-muted">Limited availability — speak with an agent today. No obligation required.</div>
      </div>
      <a href="#lead" className="flex h-12 items-center rounded-[var(--radius-btn)] bg-ink px-7 text-sm font-bold text-white">
        Claim This Offer →
      </a>
    </div>
  );
}
