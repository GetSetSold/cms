import Link from "next/link";
import { getBocDecisionAsOf, fmtRate, fmtDate, type BocDecisionSnapshot } from "@/lib/boc";
import type { BlockProps } from "./index";
import { RateChart } from "./RateChart";

/** Rule-based narrative from BoC numbers — factual, no invented data. */
function draftNarrative(s: BocDecisionSnapshot): { means: string; watch: string } {
  const move = s.change
    ? s.change.direction === "up"
      ? `raised its target rate by ${s.change.change.toFixed(2)} points to ${fmtRate(s.target)}`
      : `cut its target rate by ${s.change.change.toFixed(2)} points to ${fmtRate(s.target)}`
    : `held its target rate at ${fmtRate(s.target)}`;
  const cpiMonth = s.cpiDate
    ? new Date(s.cpiDate.slice(0, 7) + "-01T00:00:00").toLocaleDateString("en-CA", { month: "long", year: "numeric" })
    : "";
  const cpiTxt = s.cpi !== null
    ? ` Inflation (CPI) was running at ${s.cpi.toFixed(1)}%${cpiMonth ? ` in ${cpiMonth}` : ""} — ${s.cpi >= 1 && s.cpi <= 3 ? "inside" : "outside"} the Bank's 1–3% target band.`
    : "";
  const means = `On ${fmtDate(s.date)}, the Bank of Canada ${move}.${cpiTxt} Variable-rate mortgages and lines of credit priced off prime move with the target rate${s.prime !== null ? ` (prime now ${fmtRate(s.prime)})` : ""}; fixed rates follow the 5-year bond yield${s.bond5y !== null ? ` (now ${fmtRate(s.bond5y)})` : ""} more than the announcement itself.`;
  const watch = s.change && s.change.direction === "down"
    ? `With the Bank easing, variable-rate borrowers get relief and fixed rates often drift lower ahead of the move. Watch the next CPI print and the coming decision date for whether the cutting continues.`
    : s.change && s.change.direction === "up"
      ? `Higher for longer bites variable-rate borrowers first. If inflation stays sticky, expect fixed rates to hold firm too — the next CPI print is the number to watch.`
      : `A hold keeps borrowing costs where they are. The next move hinges on inflation: a hot CPI print revives hike talk, a cool one opens the door to cuts.`;
  return { means, watch };
}

function toneCls(dir: "up" | "down" | null): string {
  return dir === "up" ? "text-red-700" : dir === "down" ? "text-green-700" : "text-muted";
}

/**
 * `rate_update` block — BoC decision snapshot. Dot-point rates, change vs the
 * previous decision, CPI context, target-rate chart, auto-drafted narrative.
 * Pin `decision_date` (YYYY-MM-DD) to freeze a post's numbers; empty = latest.
 */
export async function RateUpdate({ data }: BlockProps) {
  const pinDate = (data.decision_date as string) || "";
  const showChart = data.show_chart !== false;
  const showNarrative = data.show_narrative !== false;
  const snap = await getBocDecisionAsOf(pinDate);

  if (!snap) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-line bg-white p-6 text-[13px] leading-[1.5] text-muted">
        {pinDate
          ? <>No BoC rate data for {pinDate} yet. The Valet API updates on announcement days.</>
          : <>Bank of Canada rate data is unavailable right now. Try again shortly.</>}
      </div>
    );
  }

  const narrative = showNarrative ? draftNarrative(snap) : null;
  const moveLabel = snap.change
    ? `${snap.change.direction === "up" ? "+" : "−"}${snap.change.change.toFixed(2)} vs previous`
    : "Held \u2014 no change";

  const rows: { label: string; value: string; sub?: string; subTone?: string }[] = [
    {
      label: "BoC target rate",
      value: fmtRate(snap.target),
      sub: moveLabel,
      subTone: toneCls(snap.change?.direction ?? null),
    },
    { label: "Prime rate", value: fmtRate(snap.prime) },
    { label: "5-yr bond yield", value: fmtRate(snap.bond5y) },
    {
      label: "Inflation (CPI YoY)",
      value: snap.cpi !== null ? `${snap.cpi.toFixed(1)}%` : "N/A",
      sub: snap.cpi !== null ? (snap.cpi >= 1 && snap.cpi <= 3 ? "Inside 1–3% target band" : "Outside 1–3% target band") : undefined,
    },
  ];

  const chartPoints = snap.history.map((p) => ({ date: p.date, value: p.value }));

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line bg-white shadow-[var(--shadow-card)]">
      <div className="px-6 pt-6 md:px-8">
        <h3 className="font-display text-xl font-bold tracking-tight">
          Bank of Canada Rate Decision
          <span className="ml-2 align-middle text-[13px] font-semibold leading-[1.5] text-muted">
            {fmtDate(snap.date)}{snap.isPinned ? "" : " · latest"}
          </span>
        </h3>
        <p className="mt-1 text-[13px] leading-[1.5] text-muted">
          Target for the overnight rate · announced {fmtDate(snap.date)}
        </p>
      </div>
      <ul className="mx-6 mt-4 md:mx-8">
        {rows.map((r) => (
          <li key={r.label} className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 text-[13px] leading-[1.5] last:border-b-0">
            <span className="text-muted">{r.label}</span>
            <span className="text-right font-bold text-ink">
              {r.value}
              {r.sub && <span className={`block text-[13px] font-normal leading-[1.5] ${r.subTone ?? ""}`}>{r.sub}</span>}
            </span>
          </li>
        ))}
      </ul>
      {showChart && chartPoints.length > 1 && (
        <div className="px-6 pb-2 md:px-8">
          <RateChart points={chartPoints} />
        </div>
      )}
      {narrative && (
        <div className="space-y-4 px-6 py-4 md:px-8">
          <div>
            <h4 className="mb-1 text-[13px] font-bold leading-[1.5] text-ink">What it means</h4>
            <p className="text-[13px] leading-[1.5] text-muted">{narrative.means}</p>
          </div>
          <div>
            <h4 className="mb-1 text-[13px] font-bold leading-[1.5] text-ink">What to watch</h4>
            <p className="text-[13px] leading-[1.5] text-muted">{narrative.watch}</p>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4 md:px-8">
        <p className="text-[13px] leading-[1.5] text-muted">Source: Bank of Canada Valet API</p>
        <Link
          href="/bank-of-canada-rates-guide"
          className="inline-flex items-center rounded-[var(--radius-btn,999px)] bg-ink px-5 py-2 text-[13px] font-bold leading-[1.5] text-white"
        >
          Live rate tracker
        </Link>
      </div>
    </div>
  );
}
