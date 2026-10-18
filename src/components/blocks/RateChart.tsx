"use client";

import { useState } from "react";

export interface RateChartPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

function monthYr(d: string): string {
  const dt = new Date(d + "T00:00:00");
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString("en-CA", { month: "short", year: "2-digit" }).replace(",", "");
}

function fmtDate(d: string): string {
  const dt = new Date(d + "T00:00:00");
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

/** Client-side target-rate chart: axes, gridlines, hover tooltips. */
export function RateChart({ points }: { points: RateChartPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return null;

  const W = 640, H = 240;
  const padL = 44, padR = 12, padT = 14, padB = 30;
  const vals = points.map((p) => p.value);
  const rawMin = Math.min(...vals), rawMax = Math.max(...vals);
  // Nice 0.5% step bounds
  const yMin = Math.floor(rawMin * 2) / 2;
  const yMax = Math.ceil(rawMax * 2) / 2;
  const span = Math.max(0.5, yMax - yMin);

  const X = (i: number) => padL + (i / (points.length - 1)) * (W - padL - padR);
  const Y = (v: number) => padT + (1 - (v - yMin) / span) * (H - padT - padB);

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${X(i).toFixed(1)},${Y(p.value).toFixed(1)}`).join(" ");

  // Y ticks every 0.5%
  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax + 0.001; v += 0.5) yTicks.push(parseFloat(v.toFixed(2)));
  // X ticks: ~6 evenly spaced month/yr labels
  const xTickIdx = Array.from({ length: 6 }, (_, k) =>
    Math.round((k * (points.length - 1)) / 5)
  ).filter((v, i, a) => a.indexOf(v) === i);

  const hp = hover !== null ? points[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label="Target rate 3-year trend">
        {/* gridlines + y labels */}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={padL} y1={Y(t)} x2={W - padR} y2={Y(t)} stroke="#e8e8e8" strokeWidth="1" />
            <text x={padL - 8} y={Y(t) + 4} textAnchor="end" fontSize="11" fill="#8a8a8a">
              {t.toFixed(2)}%
            </text>
          </g>
        ))}
        {/* x labels */}
        {xTickIdx.map((i) => (
          <text key={i} x={X(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="#8a8a8a">
            {monthYr(points[i].date)}
          </text>
        ))}
        {/* line */}
        <path d={path} fill="none" stroke="#4d9fff" strokeWidth="2.5" />
        {/* points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={X(i)}
            cy={Y(p.value)}
            r={hover === i ? 5 : 2.5}
            fill="#4d9fff"
            style={{ cursor: "pointer" }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        {/* persistent latest-value label */}
        <g>
          <rect
            x={Math.min(X(points.length - 1) + 8, W - padR - 76)}
            y={Y(points[points.length - 1].value) - 32}
            width="76"
            height="26"
            rx="13"
            fill="#1a1a1a"
          />
          <text
            x={Math.min(X(points.length - 1) + 8, W - padR - 76) + 38}
            y={Y(points[points.length - 1].value) - 14}
            textAnchor="middle"
            fontSize="12"
            fontWeight="700"
            fill="#ffffff"
          >
            {points[points.length - 1].value.toFixed(2)}%
          </text>
        </g>
        {/* hover crosshair + tooltip */}
        {hp && hover !== null && (
          <g>
            <line x1={X(hover)} y1={padT} x2={X(hover)} y2={H - padB} stroke="#4d9fff" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
            <g>
              <rect
                x={Math.min(Math.max(X(hover) - 62, padL), W - padR - 124)}
                y={Math.max(Y(hp.value) - 52, 4)}
                width="124"
                height="40"
                rx="8"
                fill="#1a1a1a"
              />
              <text
                x={Math.min(Math.max(X(hover) - 62, padL), W - padR - 124) + 62}
                y={Math.max(Y(hp.value) - 52, 4) + 17}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill="#ffffff"
              >
                {hp.value.toFixed(2)}%
              </text>
              <text
                x={Math.min(Math.max(X(hover) - 62, padL), W - padR - 124) + 62}
                y={Math.max(Y(hp.value) - 52, 4) + 32}
                textAnchor="middle"
                fontSize="11"
                fill="rgba(255,255,255,0.7)"
              >
                {fmtDate(hp.date)}
              </text>
            </g>
          </g>
        )}
      </svg>
      <p className="mt-2 text-center text-[13px] leading-[1.5] text-muted">
        Target rate · 3-year trend
      </p>
    </div>
  );
}
