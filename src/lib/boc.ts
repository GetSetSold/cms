/* Bank of Canada Valet API helpers — free, public, no key required. */

export const BOC_API = "https://www.bankofcanada.ca/valet";

export const BOC_SERIES = {
  TARGET: "V39079", // Target for the overnight rate (daily)
  BANK: "V122530", // Bank rate (monthly)
  PRIME: "V121796", // Prime rate (weekly)
  CORRA: "AVG.INTWO", // CORRA (daily)
  BOND_5YR: "BD.CDN.5YR.DQ.YLD", // GoC 5-year bond yield (daily)
  BANK_PRIME: "V80691311", // Posted prime rate, chartered banks
  MTG_1YR: "V80691333",
  MTG_3YR: "V80691334",
  MTG_5YR: "V80691335",
} as const;

/** BoC 2025–2026 fixed announcement dates (from BoC published schedule). */
export const BOC_SCHEDULE = [
  "2025-01-29", "2025-03-12", "2025-04-16", "2025-06-04",
  "2025-07-30", "2025-09-17", "2025-10-29", "2025-12-10",
  "2026-01-28", "2026-03-18", "2026-04-29", "2026-06-10",
  "2026-07-15", "2026-09-17", "2026-10-29", "2026-12-10",
];

export interface BocRates {
  target: number | null;
  bank: number | null;
  prime: number | null;
  corra: number | null;
  bond5y: number | null;
  bankPrime: number | null;
  mtg1yr: number | null;
  mtg3yr: number | null;
  mtg5yr: number | null;
}

export interface BocChange {
  date: string;
  oldRate: number;
  newRate: number;
  change: number;
  direction: "up" | "down";
}

export function fmtRate(n: number | null): string {
  return n !== null && isFinite(n) ? n.toFixed(2) + "%" : "N/A";
}

export function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

/** Next upcoming BoC decision date, or null when the hardcoded schedule is exhausted. */
export function nextBocDecision(now = new Date()): string | null {
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const upcoming = BOC_SCHEDULE.filter((s) => new Date(s + "T00:00:00") >= today);
  return upcoming[0] ?? null;
}

/** Derive rate changes (newest last) from a date-ascending observation list. */
export function bocChanges(obs: { date: string; value: number | null }[]): BocChange[] {
  const changes: BocChange[] = [];
  let prev: number | null = null;
  let prevDate = "";
  for (const o of obs) {
    if (o.value === null) continue;
    if (prev !== null && o.value !== prev) {
      const diff = parseFloat((o.value - prev).toFixed(2));
      changes.push({
        date: o.date,
        oldRate: prev,
        newRate: o.value,
        change: Math.abs(diff),
        direction: diff > 0 ? "up" : "down",
      });
    }
    prev = o.value; prevDate = o.date;
  }
  void prevDate;
  return changes;
}
