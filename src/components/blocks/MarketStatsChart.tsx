"use client";

import { useState } from "react";
import { HpiChart, type ChartPoint } from "@/components/hpi/HpiChart";

/** Client-side 12mo / 3yr toggle wrapping the Market Pulse chart. */
export function MarketStatsChart({ points12m, points3yr }: { points12m: ChartPoint[]; points3yr: ChartPoint[] }) {
  const [range, setRange] = useState<"12m" | "3yr">("3yr");
  const points = range === "3yr" ? points3yr : points12m;
  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5">
      <div className="mb-3 flex justify-center gap-2">
        {(["12m", "3yr"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-[var(--radius-btn,999px)] px-4 py-1 text-[13px] font-bold ${range === r ? "bg-ink text-white" : "bg-soft text-muted"}`}
          >
            {r === "12m" ? "12 mo" : "3 yr"}
          </button>
        ))}
      </div>
      <h3 className="mb-2 text-center text-[15px] font-semibold">Benchmark price trend</h3>
      <HpiChart points={points} height={220} />
    </div>
  );
}
