/* Bank of Canada Valet API helpers — free, public, no key required. */

import { fetchAnnouncedDecision } from "./boc-announced";

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

/** BoC fixed announcement dates (from BoC published schedule). */
export const BOC_SCHEDULE = [
  "2025-01-29", "2025-03-12", "2025-04-16", "2025-06-04",
  "2025-07-30", "2025-09-17", "2025-10-29", "2025-12-10",
  "2026-01-28", "2026-03-18", "2026-04-29", "2026-06-10",
  "2026-07-15", "2026-09-02", "2026-10-28", "2026-12-09",
  "2027-01-27", "2027-03-03", "2027-04-28", "2027-06-02",
  "2027-07-21", "2027-09-08", "2027-10-27", "2027-12-08",
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
  /** Effective date of the decision, when this snapshot came from the
   *  announced layer (see boc-announced.ts); null for Valet snapshots. */
  effectiveDate?: string | null;
  /** True when this snapshot is the announced decision, not a Valet row. */
  announced?: boolean;
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

/** Sample daily observations to ~one point per month for a readable 3yr chart. */
function monthlySample(obs: { date: string; value: number }[]): { date: string; value: number }[] {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 3);
  const cut = cutoff.toISOString().slice(0, 10);
  const recent = obs.filter((o) => o.date >= cut);
  const out: { date: string; value: number }[] = [];
  let lastMonth = "";
  for (const o of recent) {
    const m = o.date.slice(0, 7);
    if (m !== lastMonth || o.date === recent[recent.length - 1].date) {
      out.push(o);
      lastMonth = m;
    }
  }
  return out;
}

/**
 * Fetch the BoC decision snapshot as of `pinDate` (YYYY-MM-DD).
 * Empty pin = latest decision. Historical pins freeze the post's numbers.
 */
export async function getBocDecisionAsOf(pinDate: string): Promise<BocDecisionSnapshot | null> {
  const pin = /^\d{4}-\d{2}-\d{2}$/.test(pinDate) ? pinDate : "";
  const [rates, cpiObs, announced] = await Promise.all([
    valet(`${BOC_SERIES.TARGET},${BOC_SERIES.PRIME},${BOC_SERIES.BOND_5YR}`, "start_date=2020-01-01&order_dir=asc"),
    valet(BOC_SERIES.CPI, "start_date=2020-01-01&order_dir=asc"),
    fetchAnnouncedDecision(),
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

  // Previous DECISION: walk back to where the current rate run started.
  // Only counts if the change happened at/after the previous scheduled
  // announcement — otherwise it's a stale year-old move, treat as a hold.
  const schedIdx = BOC_SCHEDULE.findIndex((s) => s >= cur.date);
  const prevSched = schedIdx > 0 ? BOC_SCHEDULE[schedIdx - 1]
    : schedIdx === -1 ? BOC_SCHEDULE[BOC_SCHEDULE.length - 1] : null;
  let runStart = idx;
  while (runStart > 0 && targetObs[runStart - 1].value === cur.value) runStart--;
  let prevRate: number | null = runStart > 0 ? targetObs[runStart - 1].value : null;
  if (prevRate !== null && prevSched && targetObs[runStart].date < prevSched) {
    prevRate = cur.value; // stale change — this decision was a hold
  }
  const diff = prevRate !== null ? parseFloat((cur.value - prevRate).toFixed(2)) : 0;
  const change: BocChange | null = diff !== 0
    ? {
        date: cur.date,
        oldRate: prevRate as number,
        newRate: cur.value,
        change: Math.abs(diff),
        direction: diff > 0 ? "up" : "down",
      }
    : null;

  // Prime / bond: most recent observation at or before the decision date
  // (weekly/monthly series rarely land exactly on decision day).
  let prime: number | null = null;
  let bond5y: number | null = null;
  for (let i = rates.length - 1; i >= 0; i--) {
    const o = rates[i];
    if (o.d > cur.date) continue;
    if (prime === null) prime = num(o[BOC_SERIES.PRIME]);
    if (bond5y === null) bond5y = num(o[BOC_SERIES.BOND_5YR]);
    if (prime !== null && bond5y !== null) break;
  }

  // CPI: index -> YoY % (12 months apart).
  const cpiRows = cpiObs
    .map((o) => ({ date: o.d, value: num(o[BOC_SERIES.CPI]) }))
    .filter((o) => o.value !== null) as { date: string; value: number }[];
  let cpi: { date: string; value: number } | null = null;
  let cpiYoY: number | null = null;
  for (const r of cpiRows) {
    if (r.date <= cur.date) cpi = r;
    else break;
  }
  if (cpi) {
    const y = Number(cpi.date.slice(0, 4)) - 1;
    const m = cpi.date.slice(5, 7);
    const yearAgo = cpiRows.find((r) => r.date.startsWith(`${y}-${m}`));
    if (yearAgo && yearAgo.value) {
      cpiYoY = parseFloat((((cpi.value - yearAgo.value) / yearAgo.value) * 100).toFixed(1));
    }
  }

  // Announced layer (see boc-announced.ts): on announcement day Valet
  // still shows the old rate, because a change takes effect the next
  // business day. When the Bank's announced decision is the one being
  // rendered — pinned to its date, or latest and newer than / equal to the
  // Valet snapshot — show the announced decision dated its announcement
  // date, with its effective date. Prime is NOT taken from the
  // announcement: it stays on Valet (the loop above), arriving later when
  // banks update, exactly as requested. If Valet is already newer with a
  // different rate (announced page stale), Valet wins and we fall through.
  if (announced) {
    const applies =
      pin === announced.date ||
      (!pin && (announced.date >= cur.date || announced.target === cur.value));
    if (applies) {
      const prevForChange = [...targetObs].reverse().find((o) => o.date <= announced.date)?.value ?? null;
      const annChange = announced.change !== 0
        ? announced.change
        : prevForChange !== null
          ? parseFloat((announced.target - prevForChange).toFixed(2))
          : 0;
      const history = monthlySample(targetObs.slice(0, idx + 1));
      const lastHist = history[history.length - 1];
      if (lastHist && lastHist.date === announced.date) lastHist.value = announced.target;
      else if (!lastHist || lastHist.date < announced.date) history.push({ date: announced.date, value: announced.target });
      return {
        date: announced.date,
        target: announced.target,
        prime,
        bond5y,
        cpi: cpiYoY,
        cpiDate: cpi?.date ?? null,
        change: annChange !== 0 && prevForChange !== null
          ? {
              date: announced.date,
              oldRate: prevForChange,
              newRate: announced.target,
              change: Math.abs(annChange),
              direction: annChange > 0 ? "up" : "down",
            }
          : null,
        history,
        isPinned: !!pin,
        effectiveDate: announced.effectiveDate,
        announced: true,
      };
    }
  }

  return {
    date: cur.date,
    target: cur.value,
    prime,
    bond5y,
    cpi: cpiYoY,
    cpiDate: cpi?.date ?? null,
    change,
    history: monthlySample(targetObs.slice(0, idx + 1)),
    isPinned: !!pin,
    effectiveDate: null,
    announced: false,
  };
}
