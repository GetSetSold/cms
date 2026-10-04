"use client";

import { useMemo, useRef, useState } from "react";
import { fmtMoney, fmtMoneyShort, monthShort } from "@/lib/hpi-format";

export interface ChartPoint {
  month: string;
  value: number;
  hpi?: number;
}

/**
 * Minimal black line chart with hover tooltip.
 * Thin 1.5px black stroke, light-grey horizontal gridlines, muted labels.
 */
export function HpiChart({
  points,
  height = 240,
  formatValue = fmtMoney,
  showHpi = false,
}: {
  points: ChartPoint[];
  height?: number;
  formatValue?: (v: number) => string;
  showHpi?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 760;
  const H = height;
  const PAD_L = 52, PAD_R = 16, PAD_T = 18, PAD_B = 28;

  const geom = useMemo(() => {
    const vals = points.map((p) => p.value);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    const pad = (hi - lo) * 0.12 || Math.max(1, hi * 0.01);
    lo -= pad; hi += pad;
    const n = vals.length;
    const px = (i: number) => PAD_L + (i * (W - PAD_L - PAD_R)) / Math.max(1, n - 1);
    const py = (v: number) => PAD_T + ((hi - v) * (H - PAD_T - PAD_B)) / (hi - lo);
    return { lo, hi, px, py, n };
  }, [points, H]);

  if (!points.length) return null;
  const { px, py, n, lo, hi } = geom;
  const line = points.map((p, i) => `${px(i).toFixed(1)},${py(p.value).toFixed(1)}`).join(" ");
  const last = points[n - 1];
  const gridVals = [0, 1, 2, 3, 4].map((g) => hi - (g * (hi - lo)) / 4);
  // x labels: ~6 evenly spaced
  const labelIdx = new Set(Array.from({ length: Math.min(6, n) }, (_, k) => Math.round((k * (n - 1)) / Math.min(5, n - 1))));

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const rel = (x - PAD_L) / (W - PAD_L - PAD_R);
    const i = Math.round(rel * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  const hp = hover != null ? points[hover] : null;

  return (
    <div ref={ref} className="relative w-full" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img">
        {gridVals.map((gv, g) => {
          const y = PAD_T + ((hi - gv) * (H - PAD_T - PAD_B)) / (hi - lo);
          return (
            <g key={g}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#e8e8e8" strokeWidth={1} />
              <text x={PAD_L - 8} y={y + 4} textAnchor="end" fontSize={10} fill="#999">
                {fmtMoneyShort(gv)}
              </text>
            </g>
          );
        })}
        {points.map((p, i) =>
          labelIdx.has(i) ? (
            <text key={i} x={px(i)} y={H - 8} textAnchor="middle" fontSize={10} fill="#999">
              {monthShort(p.month)}
            </text>
          ) : null
        )}
        <polyline points={line} fill="none" stroke="#111" strokeWidth={1.5} strokeLinejoin="round" />
        {/* hover crosshair */}
        {hover != null && (
          <g>
            <line x1={px(hover)} y1={PAD_T} x2={px(hover)} y2={H - PAD_B} stroke="#111" strokeWidth={1} strokeDasharray="3 3" opacity={0.4} />
            <circle cx={px(hover)} cy={py(points[hover].value)} r={4.5} fill="#111" />
          </g>
        )}
        {/* latest point marker */}
        <circle cx={px(n - 1)} cy={py(last.value)} r={4.5} fill="#111" />
        <text x={px(n - 1) - 8} y={py(last.value) - 12} textAnchor="end" fontSize={12} fontWeight={700} fill="#111">
          {formatValue(last.value)}
        </text>
        {/* invisible hover targets */}
        {points.map((p, i) => (
          <rect key={i} x={px(i) - (W / n) / 2} y={PAD_T} width={W / n} height={H - PAD_T - PAD_B} fill="transparent" />
        ))}
      </svg>
      {hp && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-white px-3 py-1.5 text-xs shadow-md"
          style={{
            left: `${(px(hover!) / W) * 100}%`,
            top: 0,
          }}
        >
          <div className="font-semibold">{monthShort(hp.month)}</div>
          <div>{formatValue(hp.value)}{showHpi && hp.hpi != null ? ` · HPI ${hp.hpi}` : ""}</div>
        </div>
      )}
    </div>
  );
}

/** Tiny sparkline for table cells (no interactivity). */
export function HpiSpark({ values, width = 110, height = 34 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const lo = Math.min(...values), hi = Math.max(...values);
  const rng = hi - lo || 1;
  const n = values.length;
  const px = (i: number) => 2 + (i * (width - 4)) / (n - 1);
  const py = (v: number) => 3 + ((hi - v) * (height - 6)) / rng;
  const pts = values.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width, height }} className="inline-block" aria-hidden>
      <polyline points={pts} fill="none" stroke="#111" strokeWidth={1.5} />
    </svg>
  );
}
