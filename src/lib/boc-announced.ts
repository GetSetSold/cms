/* Announced Bank of Canada decision layer (server-only).
 *
 * Problem it solves: the Valet daily target-rate series (V39079) records the
 * rate *in effect* on each business day, and since 2021 a BoC change takes
 * effect the day AFTER its announcement. So on decision day itself Valet
 * still shows the old rate, and the guide/block look a day behind.
 *
 * This layer reads the Bank's own key-rate page — updated on announcement
 * day — and returns the latest announced decision with its effective date
 * (announcement + 1 business day). It is an *overlay*, not a replacement:
 * - It only ever overrides the target rate (and the mechanically derived
 *   bank rate, target + 0.25). Prime is NEVER overridden here: prime
 *   follows bank announcements and arrives later, via Valet, as before.
 * - Any fetch or parse failure returns null and callers fall back to the
 *   existing Valet-only behaviour. A failed announced fetch must never
 *   break a page.
 */

export interface AnnouncedDecision {
  /** Announcement date (YYYY-MM-DD), e.g. the scheduled decision date. */
  date: string;
  /** Announced target for the overnight rate, in percent. */
  target: number;
  /** Change vs the previous decision, in points (0 for a hold). */
  change: number;
  /** Date the change takes effect (YYYY-MM-DD): announcement + 1 business day. */
  effectiveDate: string;
}

const KEY_RATE_URL =
  "https://www.bankofcanada.ca/core-functions/monetary-policy/key-interest-rate/";

const MONTHS: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
};

function stripTags(s: string): string {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseLongDate(cell: string): string | null {
  // Tolerate a trailing footnote asterisk on the date cell.
  const m = cell.replace(/\*+$/, "").trim().match(/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${month}-${m[2].padStart(2, "0")}`;
}

function parseChange(cell: string): number | null {
  const c = cell.replace(/%/g, "").replace(/−/g, "-").trim();
  if (c === "---" || c === "—" || c === "-" || c === "") return 0;
  const n = parseFloat(c);
  return isFinite(n) ? n : null;
}

/**
 * Parse the BoC key-rate history table out of the page HTML. The history
 * table comes first in the document, so the first row matching
 * "Month D, YYYY | target | change" is the latest announced decision.
 * Returns null when nothing matches (page redesigned, blocked, etc.).
 */
export function parseKeyRatePage(html: string): Omit<AnnouncedDecision, "effectiveDate"> | null {
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let row: RegExpExecArray | null;
  while ((row = rowRe.exec(html)) !== null) {
    const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    const cells: string[] = [];
    let cell: RegExpExecArray | null;
    while ((cell = cellRe.exec(row[1])) !== null) cells.push(stripTags(cell[1]));
    if (cells.length < 2) continue;
    const date = parseLongDate(cells[0]);
    if (!date) continue;
    const target = parseFloat(cells[1].replace(/%/g, "").trim());
    if (!isFinite(target)) continue;
    const change = cells.length >= 3 ? parseChange(cells[2]) : 0;
    if (change === null) continue;
    return { date, target, change };
  }
  return null;
}

/** Announcement + 1 day, skipping Saturday/Sunday. All scheduled BoC dates
 *  are Wednesdays, so this is normally just the next day. */
export function effectiveDateFor(announcementIso: string): string {
  const d = new Date(announcementIso + "T00:00:00");
  do {
    d.setDate(d.getDate() + 1);
  } while (d.getDay() === 0 || d.getDay() === 6);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Fetch the latest announced decision. Cached 5 minutes: fresh enough to
 * show a decision within minutes of its 9:45am ET announcement, without
 * hammering the Bank's site on every page view. Never throws.
 */
export async function fetchAnnouncedDecision(): Promise<AnnouncedDecision | null> {
  try {
    const r = await fetch(KEY_RATE_URL, { next: { revalidate: 300 } });
    if (!r.ok) return null;
    const html = await r.text();
    const parsed = parseKeyRatePage(html);
    if (!parsed) return null;
    return { ...parsed, effectiveDate: effectiveDateFor(parsed.date) };
  } catch {
    return null;
  }
}
