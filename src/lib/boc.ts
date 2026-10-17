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
  CPI: "V41690973", // CPI all items, monthly (StatCan via BoC)
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

/* ---------- Server-side BoC snapshot (for the rate_update block) ---------- */

export interface BocDecisionSnapshot {
  /** Decision date actually rendered (pinned or latest). */
  date: string;
  target: number | null;
  prime: number | null;
  bond5y: number | null;
  cpi: number | null;
  cpiDate: string | null;
  /** Change vs the previous decision, if any. */
  change: BocChange | null;
  /** Target-rate history for the chart (date-ascending). */
  history: { date: string; value: number }[];
  isPinned: boolean;
}

interface ValetObs {
  d: string;
  [k: string]: { v: string } | string;
}

async function valet(series: string, params: string): Promise<ValetObs[]> {
  const r = await fetch(`${BOC_API}/observations/${series}/json?${params}`, {
    next: { revalidate: 3600 },
  });
  if (!r.ok) return [];
  const j = await r.json();
  return (j.observations ?? []) as ValetObs[];
}

function num(v: unknown): number | null {
  if (v && typeof v === "object" && "v" in v) {
    const n = parseFloat((v as { v: string }).v);
    return isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Fetch the BoC decision snapshot as of `pinDate` (YYYY-MM-DD).
 * Empty pin = latest decision. Historical pins freeze the post's numbers.
 */
export async function getBocDecisionAsOf(pinDate: string): Promise<BocDecisionSnapshot | null> {
  const pin = /^\d{4}-\d{2}-\d{2}$/.test(pinDate) ? pinDate : "";
  const [rates, cpiObs] = await Promise.all([
    valet(`${BOC_SERIES.TARGET},${BOC_SERIES.PRIME},${BOC_SERIES.BOND_5YR}`, "start_date=2020-01-01&order_dir=asc"),
    valet(BOC_SERIES.CPI, "start_date=2020-01-01&order_dir=asc"),
  ]);
  if (!rates.length) return null;

  const targetObs = rates
    .map((o) => ({ date: o.d, value: num(o[BOC_SERIES.TARGET]) }))
    .filter((o) => o.value !== null) as { date: string; value: number }[];
  if (!targetObs.length) return null;

  // Latest observation at or before the pin (or the very latest).
  let idx = targetObs.length - 1;
  if (pin) {
    idx = -1;
    for (let i = 0; i < targetObs.length; i++) {
      if (targetObs[i].date <= pin) idx = i;
      else break;
    }
    if (idx < 0) return null;
  }
  const cur = targetObs[idx];
  const byDate = new Map(rates.map((o) => [o.d, o]));

  // Previous decision = most recent earlier observation with a different value.
  let prev: { date: string; value: number } | null = null;
  for (let i = idx - 1; i >= 0; i--) {
    if (targetObs[i].value !== cur.value) { prev = targetObs[i]; break; }
  }
  const change: BocChange | null = prev
    ? {
        date: cur.date,
        oldRate: prev.value,
        newRate: cur.value,
        change: Math.abs(parseFloat((cur.value - prev.value).toFixed(2))),
        direction: cur.value > prev.value ? "up" : "down",
      }
    : null;

  const row = byDate.get(cur.date);
  const cpiRows = cpiObs
    .map((o) => ({ date: o.d, value: num(o[BOC_SERIES.CPI]) }))
    .filter((o) => o.value !== null) as { date: string; value: number }[];
  // Latest CPI at or before the decision date.
  let cpi: { date: string; value: number } | null = null;
  for (const c of cpiRows) {
    if (c.date <= cur.date) cpi = c;
    else break;
  }

  return {
    date: cur.date,
    target: cur.value,
    prime: row ? num(row[BOC_SERIES.PRIME]) : null,
    bond5y: row ? num(row[BOC_SERIES.BOND_5YR]) : null,
    cpi: cpi?.value ?? null,
    cpiDate: cpi?.date ?? null,
    change,
    history: targetObs.slice(Math.max(0, idx - 36), idx + 1),
    isPinned: !!pin,
  };
}

