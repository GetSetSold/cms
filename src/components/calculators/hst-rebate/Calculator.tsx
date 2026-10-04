"use client";
/**
 * Ontario New Home HST Rebate Calculator.
 * Slug: ontario-hst-rebate-calculator
 *
 * Both rebate frameworks are CONFIGURED ASSUMPTIONS (Admin → Calculators) —
 * planning estimates, not verified law.
 */
import { useCallback, useMemo, useState } from "react";
import type { CalculatorSettings } from "@/lib/calculators/types";
import { fmtCAD, todayISO } from "@/lib/calculators/math";
import {
  Field,
  Slider,
  Segmented,
  Card,
  ResultHero,
  MetricRow,
} from "../ui";
import { ReportButtons } from "../ReportButtons";
import {
  buildHstRebatePdf,
  hstExpandedRules,
  hstPreviousRules,
  hstRegimeLabel,
  type HstRegime,
  type HstReportState,
} from "./pdf";

function signedCAD(n: number): string {
  const r = Math.round(n);
  return (r < 0 ? "-" : "+") + fmtCAD(Math.abs(r));
}

const EXPANDED_TIERS: [string, string][] = [
  ["Up to $1,000,000", "Full 13% (Max $130K)"],
  ["$1,000,001 - $1,500,000", "$130K to ~$97K"],
  ["$1,500,001 - $1,850,000", "~$97K to $24K"],
  ["Over $1,850,000", "$24,000 (Base Only)"],
];

const PREVIOUS_TIERS: [string, string][] = [
  ["Up to $368,200 (base ~$350K)", "Up to $30,300"],
  ["$368,200 - $424,850 (base ~$400K)", "Federal Phasing Out"],
  ["$424,850 - $484,500 (base ~$450K)", "Fed ~$0, ON up to $24K"],
  ["Over $484,500 (base >$450K)", "ON $24,000 Max"],
];

const BAND_TONE: Record<string, string> = {
  b1: "border-emerald-500",
  b2: "border-amber-500",
  b3: "border-orange-500",
  b4: "border-red-500",
};

export function HstRebateCalculator({ settings }: { settings: CalculatorSettings }) {
  void settings;
  const [price, setPrice] = useState(700000);
  const [regime, setRegime] = useState<HstRegime>("expanded");

  const state: HstReportState = useMemo(() => {
    const result = regime === "expanded" ? hstExpandedRules(price) : hstPreviousRules(price);
    const other = regime === "expanded" ? hstPreviousRules(price) : hstExpandedRules(price);
    return {
      price,
      regime,
      result,
      other,
      netHST: Math.max(0, result.th - result.tr),
      savings: result.tr - other.tr,
    };
  }, [price, regime]);

  const { result, other, netHST, savings } = state;
  const isExpanded = regime === "expanded";
  const newTr = isExpanded ? result.tr : other.tr;
  const oldTr = isExpanded ? other.tr : result.tr;
  const tiers = isExpanded ? EXPANDED_TIERS : PREVIOUS_TIERS;

  const tips: string[] = [];
  if (savings > 0) {
    tips.push(
      `Extra Savings — Under the Expanded 2026 framework (configured assumption), you save an additional ${fmtCAD(Math.abs(savings))} compared to the Previous framework.`,
    );
  } else if (savings < 0) {
    tips.push(
      "Note — For this price point, the Previous framework actually provides a higher rebate. Consider both options when timing your purchase.",
    );
  }
  if (price <= 1000000 && isExpanded) {
    tips.push(
      "Full HST Removal — Homes at or below $1,000,000 receive the complete 13% HST rebate. The rebate can be assigned to your builder at closing, reducing your upfront cost.",
    );
  }
  if (price > 1000000 && price <= 1500000 && isExpanded) {
    tips.push(
      "Declining Rebate Zone — Between $1M and $1.5M, the rebate declines smoothly from $130,000. Consider options closer to $1M for maximum savings.",
    );
  }
  tips.push(
    "Builder Assignment — The rebate can be assigned directly to your builder at the point of sale. You do not need to pay the full HST upfront and wait for a refund.",
    "Program Window (configured assumption) — The Expanded 2026 framework applies to purchase agreements signed between April 1, 2026 and March 31, 2027. Construction must begin by December 31, 2028 and be substantially completed by December 31, 2031.",
    "All Buyers Qualify — Unlike earlier programs limited to first-time buyers, the expanded rebate is available to all eligible buyers regardless of ownership history.",
    "Rental Properties — The rebate also extends to residential rental properties. Construction must have begun before March 31, 2026, and the home must be substantially completed by December 31, 2029.",
  );
  if (price > 1850000) {
    tips.push(
      "High-Value Homes — For homes above $1.85M, only the $24,000 provincial rebate applies. The expanded federal portion does not extend to this price range.",
    );
  }

  const buildPdf = useCallback(
    () => buildHstRebatePdf({ state, settings, reportDate: todayISO() }),
    [state, settings],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <div className="space-y-6">
        <Card title="Property Details">
          <div className="space-y-5">
            <Field
              label={`Purchase Price (incl. HST) — ${fmtCAD(price)}`}
              hint="Total price including HST from your Agreement of Purchase and Sale"
            >
              <Slider value={price} onChange={setPrice} min={300000} max={3000000} step={10000} />
            </Field>
            <Field label="Select Rebate Framework">
              <Segmented<HstRegime>
                value={regime}
                onChange={setRegime}
                options={[
                  { value: "expanded", label: "Expanded 2026 Framework" },
                  { value: "previous", label: "Previous Framework" },
                ]}
              />
              <p className="mt-1.5 text-[11.5px] leading-5 text-muted">
                Configured assumptions managed in Admin → Calculators — estimates, not verified law.
              </p>
            </Field>
          </div>
        </Card>
        <Card title={`Rebate Tiers (${hstRegimeLabel(regime)})`}>
          {tiers.map(([range, val]) => (
            <MetricRow key={range} label={range} value={val} />
          ))}
        </Card>
      </div>
      <div className="space-y-6">
        <div className={`rounded-[var(--radius-md)] border border-line border-l-4 ${BAND_TONE[result.band]} bg-white p-5 shadow-[var(--shadow)]`}>
          <div className="text-[15px] font-bold text-ink">{result.bandTitle}</div>
          <p className="mt-1.5 text-[13px] leading-6 text-muted">{result.bandDesc}</p>
        </div>
        <ResultHero
          label={`Total HST Rebate (${hstRegimeLabel(regime)})`}
          value={fmtCAD(result.tr)}
          sub={`Base price: ${fmtCAD(result.bp)} | Total HST: ${fmtCAD(result.th)}`}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Builder's Base Price", fmtCAD(result.bp), "Pre-HST amount"],
            ["Total HST (13%)", fmtCAD(result.th), "Before rebate"],
            ["Federal Rebate (5%)", fmtCAD(result.fr), ""],
            ["Ontario Rebate (8%)", fmtCAD(result.orb), ""],
            ["HST You Actually Pay", fmtCAD(netHST), ""],
          ].map(([label, val, sub], i) => (
            <Card key={label}>
              <div className="text-[12px] font-semibold uppercase tracking-wide text-muted">{label}</div>
              <div
                className={`mt-1 text-[20px] font-bold tabular-nums ${
                  i === 4 ? (netHST < 100 ? "text-emerald-600" : "text-ink") : "text-ink"
                }`}
              >
                {val}
              </div>
              {sub && <div className="mt-0.5 text-[11px] text-muted">{sub}</div>}
            </Card>
          ))}
        </div>
        <Card title="Framework Comparison">
          <MetricRow label="Rebate (Expanded 2026 Framework)" value={fmtCAD(newTr)} strong />
          <MetricRow label="Rebate (Previous Framework)" value={fmtCAD(oldTr)} strong />
          <div className="mt-2 border-t border-line pt-2">
            <MetricRow
              label="Your Extra Savings"
              value={signedCAD(savings)}
              strong
              tone={savings > 0 ? "good" : savings < 0 ? "bad" : "muted"}
            />
          </div>
          <p className="mt-2 text-[11.5px] text-muted">
            Both frameworks are configured assumptions — estimates only.
          </p>
        </Card>
        <Card title="HST Rebate Tips">
          <ul className="space-y-3">
            {tips.map((t, i) => (
              <li key={i} className="flex gap-2.5 text-[13.5px] leading-6 text-muted">
                <span className="mt-0.5 shrink-0 text-accent">•</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </Card>
        <ReportButtons
          slug="ontario-hst-rebate-calculator"
          title="Ontario HST Rebate Calculator"
          buildPdf={buildPdf}
        />
      </div>
    </div>
  );
}
