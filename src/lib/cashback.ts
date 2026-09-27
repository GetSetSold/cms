import type { SiteSettings } from "@/lib/types";

type CashbackConfig = SiteSettings["precon_cashback"];

/** Returns the cashback dollar amount for a given price, or null if cashback
 *  is disabled, unset, or the price is missing/invalid. Centralized so every
 *  page computes it identically — no more hardcoded 1% scattered around. */
export function getCashbackAmount(price: number | string | null | undefined, cfg: CashbackConfig | undefined): number | null {
  if (!cfg?.enabled || !cfg.value) return null;
  const n = typeof price === "string" ? Number(price) : price;
  if (n == null || isNaN(n) || n <= 0) return null;
  const amount = cfg.type === "flat" ? cfg.value : n * (cfg.value / 100);
  return Math.round(amount);
}

export function formatCashback(amount: number): string {
  return `$${amount.toLocaleString()}`;
}
