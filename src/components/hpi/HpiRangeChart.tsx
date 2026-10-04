"use client";

import { useMemo, useState } from "react";
import { HpiChart, type ChartPoint } from "./HpiChart";

const RANGES = [
  { id: "1Y", months: 12 },
  { id: "3Y", months: 36 },
  { id: "5Y", months: 60 },
  { id: "10Y", months: 120 },
  { id: "All", months: 0 },
] as const;

/** Full-history chart with 1Y/3Y/5Y/10Y/All range selector. */
export function HpiRangeChart({
  history,
  height = 260,
  valueKey = "compositeBenchmark",
}: {
  history: { month: string; compositeBenchmark: number; compositeHPI: number }[];
  height?: number;
  valueKey?: "compositeBenchmark" | "compositeHPI";
}) {
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("1Y");
  const points: ChartPoint[] = useMemo(() => {
    const r = RANGES.find((x) => x.id === range)!;
    const slice = r.months ? history.slice(-r.months) : history;
    return slice.map((h) => ({
      month: h.month,
      value: valueKey === "compositeHPI" ? h.compositeHPI : h.compositeBenchmark,
      hpi: h.compositeHPI,
    }));
  }, [history, range, valueKey]);

  return (
    <div>
      <div className="mb-3 flex gap-1.5">
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            className={`rounded-md border px-3 py-1 text-[13px] transition-colors ${
              range === r.id ? "border-black bg-black text-white" : "border-line bg-white text-ink hover:border-black"
            }`}
          >
            {r.id}
          </button>
        ))}
      </div>
      <HpiChart
        points={points}
        height={height}
        formatValue={valueKey === "compositeHPI" ? (v) => v.toFixed(1) : undefined}
        showHpi={valueKey !== "compositeHPI"}
      />
    </div>
  );
}
