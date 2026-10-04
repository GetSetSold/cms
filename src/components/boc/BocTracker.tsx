"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BOC_API, BOC_SERIES, BOC_SCHEDULE,
  fmtRate, fmtDate, nextBocDecision, bocChanges, type BocChange,
} from "@/lib/boc";

const CPI_SERIES = "V41690973";

interface Decision {
  date: string;
  type: "change" | "hold";
  oldRate?: number;
  newRate?: number;
  change?: number;
  direction?: "up" | "down";
  rate?: number;
}

interface MonthPt {
  m: string;
  target: number | null;
  bank: number | null;
  prime: number | null;
  cpi: number | null;
}

/** CMS block header: eyebrow + heading + full-width hairline + subline. */
function BlockHead({ eyebrow, heading, sub }: { eyebrow: string; heading: string; sub?: string }) {
  return (
    <div className="mb-5 flex flex-col gap-3">
      <div className="text-sm font-semibold uppercase tracking-wide text-accent">{eyebrow}</div>
      <h2 className="text-[26px] font-bold leading-tight tracking-tight text-ink">{heading}</h2>
      <div className="h-px w-full border-t border-line" />
      {sub ? <p className="text-[15px] font-medium leading-relaxed text-muted">{sub}</p> : null}
    </div>
  );
}

function latestVal(obs: any[], series: string): number | null {
  for (const o of obs) {
    const v = o?.[series];
    if (v && typeof v === "object" && "v" in v) return parseFloat(v.v);
  }
  return null;
}

function Skeleton({ w = 90, h = 30 }: { w?: number; h?: number }) {
  return <div className="animate-pulse rounded bg-neutral-200" style={{ width: w, height: h, margin: "0 auto" }} />;
}

/** Full decision list: changes matched to scheduled meetings + hold entries, newest first. */
function getDecisions(changes: BocChange[]): Decision[] {
  const decisions: Decision[] = [];
  const used = new Set<string>();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (const c of changes) {
    const cTime = new Date(c.date + "T00:00:00").getTime();
    let best: string | null = null;
    let bestDist = Infinity;
    for (const s of BOC_SCHEDULE) {
      if (used.has(s)) continue;
      const dist = Math.abs(new Date(s + "T00:00:00").getTime() - cTime);
      if (dist < 10 * 86400000 && dist < bestDist) { best = s; bestDist = dist; }
    }
    if (best) { used.add(best); decisions.push({ ...c, date: best, type: "change" }); }
    else decisions.push({ ...c, type: "change" });
  }
  for (const s of BOC_SCHEDULE) {
    if (used.has(s)) continue;
    const sDate = new Date(s + "T00:00:00");
    if (sDate > today) continue;
    let rate: number | null = null;
    for (let i = changes.length - 1; i >= 0; i--) {
      if (new Date(changes[i].date + "T00:00:00") <= sDate) { rate = changes[i].newRate; break; }
    }
    if (rate === null && changes.length > 0) rate = changes[0].oldRate;
    if (rate !== null) decisions.push({ date: s, type: "hold", rate });
  }
  decisions.sort((a, b) => new Date(b.date + "T00:00:00").getTime() - new Date(a.date + "T00:00:00").getTime());
  return decisions;
}

function useCountdown() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const next = nextBocDecision(now);
  if (!next) return { next: null as string | null, parts: null };
  const target = new Date(next + "T09:45:00-05:00").getTime();
  const diff = Math.max(0, target - now.getTime());
  return {
    next,
    parts: {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff / 3600000) % 24),
      m: Math.floor((diff / 60000) % 60),
      s: Math.floor((diff / 1000) % 60),
    },
  };
}

function RateCard({ label, value, sub, accent, loading, badge }: {
  label: string; value: string; sub: string; accent: string; loading: boolean; badge?: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-lg border border-line bg-white px-4 py-5 text-center shadow-sm">
      <div className="absolute left-0 right-0 top-0 h-1" style={{ background: accent }} />
      <span className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted">{label}</span>
      <div className="text-[28px] font-bold leading-tight text-ink">
        {loading ? <Skeleton /> : value}
      </div>
      {badge}
      <span className="mt-1 text-[11px] text-muted">{sub}</span>
    </div>
  );
}

const CHART_W = 760;
const CHART_H = 260;

function BocChart({ points, decisions, range, visible, onToggle }: {
  points: MonthPt[]; decisions: Decision[]; range: string;
  visible: { target: boolean; bank: boolean; prime: boolean; cpi: boolean; holds: boolean };
  onToggle: (k: "target" | "bank" | "prime" | "cpi" | "holds") => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const years = range === "all" ? 99 : parseInt(range);
  const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - years);
  const pts = points.filter((p) => new Date(p.m + "-01T00:00:00") >= cutoff);
  if (pts.length < 2) {
    return <div className="flex h-40 items-center justify-center text-[13px] text-muted">Loading chart…</div>;
  }

  const rateVals = pts.flatMap((p) => [p.target, p.bank, p.prime].filter((v): v is number => v !== null));
  const cpiVals = pts.map((p) => p.cpi).filter((v): v is number => v !== null);
  const rMax = Math.max(...rateVals) + 0.5, rMin = Math.min(...rateVals) - 0.5;
  const cMax = (cpiVals.length ? Math.max(...cpiVals) : 4) + 0.5;
  const cMin = (cpiVals.length ? Math.min(...cpiVals) : 0) - 0.5;

  const px = (i: number) => 48 + (i * (CHART_W - 110)) / (pts.length - 1);
  const pyR = (v: number) => 14 + ((rMax - v) * (CHART_H - 56)) / Math.max(0.01, rMax - rMin);
  const pyC = (v: number) => 14 + ((cMax - v) * (CHART_H - 56)) / Math.max(0.01, cMax - cMin);

  const line = (get: (p: MonthPt) => number | null, py: (v: number) => number) =>
    pts.map((p, i) => { const v = get(p); return v === null ? null : `${px(i).toFixed(1)},${py(v).toFixed(1)}`; })
      .filter(Boolean).join(" ");

  // Decision markers: scheduled meetings inside the range
  const cutoffMs = cutoff.getTime();
  const markers = decisions
    .filter((d) => { const t = new Date(d.date + "T00:00:00").getTime(); return t >= cutoffMs && t <= Date.now(); })
    .map((d) => {
      const m = d.date.substring(0, 7);
      const idx = pts.findIndex((p) => p.m === m);
      if (idx < 0 || pts[idx].target === null) return null;
      return { x: px(idx), y: pyR(pts[idx].target as number), type: d.type, date: d.date };
    })
    .filter(Boolean) as { x: number; y: number; type: string; date: string }[];

  const gridRates = [1, 2, 3, 4, 5, 6].filter((g) => g >= rMin && g <= rMax);
  const labelEvery = Math.max(1, Math.ceil(pts.length / 8));

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {([
          ["target", "Target Rate", <span key="s" className="inline-block h-0.5 w-5 bg-ink" />],
          ["bank", "Bank Rate", <span key="s" className="inline-block h-0 w-5 border-t-2 border-dashed" style={{ borderColor: "#1A6B8A" }} />],
          ["prime", "Prime Rate", <span key="s" className="inline-block h-0.5 w-5" style={{ background: "#2E86AB" }} />],
          ["cpi", "CPI Inflation (YoY %)", <span key="s" className="inline-block h-0 w-5 border-t-2 border-dashed border-amber-500" />],
          ["holds", "Held", <span key="s" className="inline-block h-2.5 w-2.5 rounded-full border-2 border-neutral-400 bg-white" />],
        ] as const).map(([k, label, swatch]) => (
          <button
            key={k}
            type="button"
            onClick={() => onToggle(k)}
            aria-pressed={visible[k]}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium transition ${
              visible[k] ? "border-ink bg-ink text-white" : "border-line bg-white text-muted"
            }`}
          >
            <span className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm border ${visible[k] ? "border-white bg-white text-ink" : "border-neutral-300 bg-white"}`}>
              {visible[k] ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M4 12l6 6L20 6" /></svg> : null}
            </span>
            {swatch} {label}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="h-auto w-full" role="img" aria-label="Historical Bank of Canada interest rates and CPI inflation chart">
        {gridRates.map((g) => (
          <g key={g}>
            <line x1="48" y1={pyR(g)} x2={CHART_W - 62} y2={pyR(g)} stroke="#e5e5e5" />
            <text x="42" y={pyR(g) + 4} fontSize="10" fill="#333" textAnchor="end">{g}%</text>
          </g>
        ))}
        <text x={CHART_W - 56} y={pyC(cMax) + 4} fontSize="10" fill="#f59e0b" textAnchor="start">{cMax.toFixed(1)}%</text>
        <text x={CHART_W - 56} y={pyC(cMin) + 4} fontSize="10" fill="#f59e0b" textAnchor="start">{cMin.toFixed(1)}%</text>
        {visible.target && <polyline points={line((p) => p.target, pyR)} fill="none" stroke="var(--c-primary,#111111)" strokeWidth="2" />}
        {visible.bank && <polyline points={line((p) => p.bank, pyR)} fill="none" stroke="#1A6B8A" strokeWidth="1.5" strokeDasharray="5 3" />}
        {visible.prime && <polyline points={line((p) => p.prime, pyR)} fill="none" stroke="#2E86AB" strokeWidth="1.5" />}
        {visible.cpi && <polyline points={line((p) => p.cpi, pyC)} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="8 4" />}
        {markers.map((mk, i) => mk.type === "hold" ? (
          visible.holds ? (
            <circle key={i} cx={mk.x} cy={mk.y} r="4" fill="#fff" stroke="#9ca3af" strokeWidth="2">
              <title>Held at {fmtDate(mk.date)}</title>
            </circle>
          ) : null
        ) : (
          visible.target ? (
            <circle key={i} cx={mk.x} cy={mk.y} r="4" fill="var(--c-primary,#111111)">
              <title>Changed {fmtDate(mk.date)}</title>
            </circle>
          ) : null
        ))}
        {pts.map((p, i) => i % labelEvery === 0 ? (
          <text key={p.m} x={px(i)} y={CHART_H - 8} fontSize="10" fill="#333" textAnchor="middle">
            {new Date(p.m + "-01T00:00:00").toLocaleDateString("en-CA", { month: "short", year: "2-digit" })}
          </text>
        ) : null)}
        {pts.map((p, i) => (
          <rect
            key={"h" + p.m}
            x={px(i) - Math.max(4, (CHART_W - 110) / pts.length / 2)}
            y={14}
            width={Math.max(8, (CHART_W - 110) / pts.length)}
            height={CHART_H - 56}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        {hover !== null && pts[hover] && (() => {
          const p = pts[hover];
          const rows: [string, string, string][] = [];
          if (visible.target && p.target !== null) rows.push(["Target Rate", p.target.toFixed(2) + "%", "#111111"]);
          if (visible.bank && p.bank !== null) rows.push(["Bank Rate", p.bank.toFixed(2) + "%", "#1A6B8A"]);
          if (visible.prime && p.prime !== null) rows.push(["Prime Rate", p.prime.toFixed(2) + "%", "#2E86AB"]);
          if (visible.cpi && p.cpi !== null) rows.push(["CPI Inflation", p.cpi.toFixed(2) + "%", "#f59e0b"]);
          const bw = 168;
          const bh = 30 + rows.length * 18;
          const anchorY = p.target !== null ? pyR(p.target) : pyR((rMax + rMin) / 2);
          // Offset away from the cursor: right of the point, flip to left near the edge
          let bx = px(hover) + 18;
          if (bx + bw > CHART_W - 60) bx = px(hover) - bw - 18;
          // Above the point, flip below if it would clip the top
          let by = anchorY - bh - 14;
          if (by < 12) by = anchorY + 22;
          return (
            <g pointerEvents="none">
              <line x1={px(hover)} y1={14} x2={px(hover)} y2={CHART_H - 42} stroke="#9ca3af" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
              <rect x={bx} y={by} width={bw} height={bh} rx="8" fill="#fff" stroke="#e5e7eb" />
              <text x={bx + 12} y={by + 20} fontSize="12" fontWeight="700" fill="#111">
                {new Date(p.m + "-01T00:00:00").toLocaleDateString("en-CA", { month: "short", year: "numeric" })}
              </text>
              {rows.map(([label, val, color], ri) => (
                <g key={label}>
                  <circle cx={bx + 16} cy={by + 32 + ri * 18} r="3.5" fill={color} />
                  <text x={bx + 26} y={by + 36 + ri * 18} fontSize="11" fill="#555">{label}:</text>
                  <text x={bx + bw - 12} y={by + 36 + ri * 18} fontSize="11" fontWeight="600" fill="#111" textAnchor="end">{val}</text>
                </g>
              ))}
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

export function BocTracker() {
  const [rates, setRates] = useState<{ target: number|null; bank: number|null; prime: number|null; corra: number|null; bond5y: number|null } | null>(null);
  const [banks, setBanks] = useState<{ bankPrime: number|null; mtg1yr: number|null; mtg3yr: number|null; mtg5yr: number|null } | null>(null);
  const [months, setMonths] = useState<MonthPt[]>([]);
  const [range, setRange] = useState("3");
  const [visible, setVisible] = useState({ target: true, bank: true, prime: true, cpi: true, holds: true });
  const { next, parts } = useCountdown();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cur = await fetch(
          `${BOC_API}/observations/${BOC_SERIES.TARGET},${BOC_SERIES.BANK},${BOC_SERIES.PRIME},${BOC_SERIES.CORRA},${BOC_SERIES.BOND_5YR}/json?recent=10`
        ).then((r) => r.json());
        const obs = cur.observations || [];
        if (alive) setRates({
          target: latestVal(obs, BOC_SERIES.TARGET),
          bank: latestVal(obs, BOC_SERIES.BANK),
          prime: latestVal(obs, BOC_SERIES.PRIME),
          corra: latestVal(obs, BOC_SERIES.CORRA),
          bond5y: latestVal(obs, BOC_SERIES.BOND_5YR),
        });
      } catch { /* skeletons stay */ }
      try {
        const bk = await fetch(
          `${BOC_API}/observations/${BOC_SERIES.BANK_PRIME},${BOC_SERIES.MTG_1YR},${BOC_SERIES.MTG_3YR},${BOC_SERIES.MTG_5YR}/json?recent=5`
        ).then((r) => r.json());
        const obs = bk.observations || [];
        if (alive) setBanks({
          bankPrime: latestVal(obs, BOC_SERIES.BANK_PRIME),
          mtg1yr: latestVal(obs, BOC_SERIES.MTG_1YR),
          mtg3yr: latestVal(obs, BOC_SERIES.MTG_3YR),
          mtg5yr: latestVal(obs, BOC_SERIES.MTG_5YR),
        });
      } catch { /* skeletons stay */ }
      try {
        const [hist, cpiRaw] = await Promise.all([
          fetch(`${BOC_API}/observations/${BOC_SERIES.TARGET},${BOC_SERIES.BANK},${BOC_SERIES.PRIME}/json?start_date=2000-01-01&order_dir=asc`).then((r) => r.json()),
          fetch(`${BOC_API}/observations/${CPI_SERIES}/json?start_date=1999-01-01&order_dir=asc`).then((r) => r.json()),
        ]);
        const map = new Map<string, MonthPt>();
        for (const o of hist.observations || []) {
          const m = o.d.substring(0, 7);
          if (!map.has(m)) map.set(m, { m, target: null, bank: null, prime: null, cpi: null });
          const e = map.get(m)!;
          const gv = (s: string) => { const v = o?.[s]; return v && typeof v === "object" && "v" in v ? parseFloat(v.v) : null; };
          const t = gv(BOC_SERIES.TARGET), b = gv(BOC_SERIES.BANK), p = gv(BOC_SERIES.PRIME);
          if (t !== null) e.target = t;
          if (b !== null) e.bank = b;
          if (p !== null) e.prime = p;
        }
        const cpiMap = new Map<string, number>();
        for (const o of cpiRaw.observations || []) {
          const v = o?.[CPI_SERIES];
          if (v && typeof v === "object" && "v" in v) cpiMap.set(o.d.substring(0, 7), parseFloat(v.v));
        }
        const list = Array.from(map.values()).sort((a, b) => a.m.localeCompare(b.m));
        for (const e of list) {
          const [y, mo] = e.m.split("-").map(Number);
          const ago = `${y - 1}-${String(mo).padStart(2, "0")}`;
          const now = cpiMap.get(e.m), then = cpiMap.get(ago);
          if (now !== undefined && then !== undefined && then !== 0) e.cpi = ((now - then) / then) * 100;
        }
        if (alive) setMonths(list);
      } catch { /* chart stays in loading state */ }
    })();
    return () => { alive = false; };
  }, []);

  const changes = useMemo(() => {
    const obs = months.flatMap((e) => e.target !== null ? [{ date: e.m + "-01", value: e.target }] : []);
    return bocChanges(obs);
  }, [months]);

  const decisions = useMemo(() => getDecisions(changes), [changes]);

  const stats = useMemo(() => {
    if (changes.length === 0) return null;
    const ups = changes.filter((c) => c.direction === "up").length;
    const downs = changes.filter((c) => c.direction === "down").length;
    const net = changes.reduce((s, c) => s + (c.direction === "up" ? c.change : -c.change), 0);
    const allR = changes.flatMap((c) => [c.newRate, c.oldRate]);
    const last = changes[changes.length - 1];
    const daysSteady = Math.floor((Date.now() - new Date(last.date + "T00:00:00").getTime()) / 86400000);
    let longest = daysSteady;
    for (let i = 0; i < changes.length - 1; i++) {
      const hold = Math.floor((new Date(changes[i + 1].date + "T00:00:00").getTime() - new Date(changes[i].date + "T00:00:00").getTime()) / 86400000);
      if (hold > longest) longest = hold;
    }
    const holds = decisions.filter((d) => d.type === "hold").length;
    return {
      total: changes.length, ups, downs, net, holds,
      totalDecisions: decisions.length,
      high: Math.max(...allR), low: Math.min(...allR),
      daysSteady, longestHold: longest,
    };
  }, [changes, decisions]);

  const loading = rates === null;
  const target = rates?.target ?? null;
  const stress = target !== null ? Math.max(target + 2, 5.25) : null;
  const prime = banks?.bankPrime ?? rates?.prime ?? null;
  const lastChange = changes.length > 0 ? changes[changes.length - 1] : null;
  const today0 = new Date(); today0.setHours(0, 0, 0, 0);
  const meetingsHeld = lastChange
    ? BOC_SCHEDULE.filter((s) => {
        const d = new Date(s + "T00:00:00");
        return d > new Date(lastChange.date + "T00:00:00") && d <= today0;
      }).length
    : 0;
  const daysSteady = lastChange
    ? Math.max(0, Math.floor((today0.getTime() - new Date(lastChange.date + "T00:00:00").getTime()) / 86400000))
    : 0;

  return (
    <div>
      {/* Live rate cards */}
      <div className="mt-8">
        <BlockHead eyebrow="Live Rates" heading="Current Bank of Canada Rates" sub="Real-time policy interest rates & historical trends" />
        <section aria-label="Current Bank of Canada interest rates" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <RateCard label="Target Overnight Rate" value={fmtRate(target)}
            sub={daysSteady > 0 ? `Key policy rate \u00b7 ${daysSteady} days steady` : "Key policy rate"}
            accent="#111111" loading={loading}
            badge={lastChange ? (
              meetingsHeld > 0 ? (
                <span className="mt-1 inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                  Held {meetingsHeld}x since last change
                </span>
              ) : (
                <span className={`mt-1 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold ${lastChange.direction === "up" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                  {lastChange.direction === "up" ? "▲" : "▼"} {lastChange.direction === "up" ? "+" : "−"}{lastChange.change.toFixed(2)}%
                </span>
              )
            ) : undefined} />
          <RateCard label="Bank Rate" value={fmtRate(rates?.bank ?? null)} sub="Target + 0.25%" accent="#1A6B8A" loading={loading} />
          <RateCard label="Prime Rate" value={fmtRate(prime)} sub="Major bank prime" accent="#2E86AB" loading={loading} />
          <RateCard label="CORRA" value={fmtRate(rates?.corra ?? null)} sub="Overnight repo rate avg" accent="#4EA8C8" loading={loading} />
          <RateCard label="OSFI Stress Test Rate" value={fmtRate(stress)} sub={target !== null ? `max(${target.toFixed(2)}% + 2%, 5.25%)` : "max(BoC + 2%, 5.25%)"} accent="#7c3aed" loading={loading} />
          <RateCard label="5-Year Bond Yield" value={fmtRate(rates?.bond5y ?? null)} sub="GoC benchmark yield" accent="#ea580c" loading={loading} />
        </section>
      </div>

      {/* Banks */}
      <div className="mt-10">
        <BlockHead eyebrow="Big 5 Banks" heading="Major Bank Prime Rates" sub="Posted prime rates from Canada's Big 5 banks — all follow the BoC policy rate" />
        <section aria-label="Major bank prime rates" className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {[["RBC", "#003168"], ["TD", "#34a853"], ["Scotiabank", "#ec111a"], ["BMO", "#0075ca"], ["CIBC", "#8b1a4a"]].map(([name, color]) => (
              <div key={name} className="rounded-lg border border-line bg-soft px-2 py-4 text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg font-bold text-white" style={{ background: color, fontSize: name === "Scotiabank" ? 11 : 13 }}>
                  {name === "Scotiabank" ? "Scotia" : name}
                </div>
                <div className="text-[12px] font-semibold text-ink">{name}</div>
                <div className="text-[20px] font-bold text-ink">{banks === null ? <Skeleton w={60} h={24} /> : fmtRate(prime)}</div>
                <div className="text-[10px] text-muted">Prime Rate</div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 border-t border-line pt-4 sm:grid-cols-3">
            {[["Posted 1-Year Fixed", banks?.mtg1yr], ["Posted 3-Year Fixed", banks?.mtg3yr], ["Posted 5-Year Fixed", banks?.mtg5yr]].map(([label, v]) => (
              <div key={label as string} className="rounded-lg border border-accent/20 bg-accent/5 px-3 py-3 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
                <div className="mt-1 text-[20px] font-bold text-accent">{banks === null ? <Skeleton w={70} h={22} /> : fmtRate(v as number | null)}</div>
                <div className="text-[10px] text-muted">Conventional mortgage</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Countdown */}
      <section aria-label="Next Bank of Canada rate decision" className="mt-10 rounded-lg border border-line bg-white p-5 text-center shadow-sm">
        <div className="text-[13px] font-semibold text-ink">Next Rate Decision</div>
        {next && parts ? (
          <>
            <div className="mb-3 text-[12px] text-muted">{fmtDate(next)} at 09:45 ET</div>
            <div className="flex justify-center gap-2">
              {[["Days", parts.d], ["Hours", parts.h], ["Min", parts.m], ["Sec", parts.s]].map(([u, v]) => (
                <div key={u as string} className="flex flex-col items-center">
                  <div className="min-w-[52px] rounded-lg bg-ink px-3 py-2 text-[22px] font-bold tabular-nums text-white">
                    {String(v).padStart(2, "0")}
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-wider text-muted">{u}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-[13px] text-muted">Next decision schedule to be announced — check bankofcanada.ca</div>
        )}
      </section>

      {/* Chart */}
      <div className="mt-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="text-sm font-semibold uppercase tracking-wide text-accent">Historical Data</div>
            <h2 className="text-[26px] font-bold leading-tight tracking-tight text-ink">Historical Rate Trends</h2>
            <div className="h-px w-full border-t border-line" />
            <p className="text-[15px] font-medium leading-relaxed text-muted">Interest rates &amp; CPI inflation (YoY %) — dots mark each BoC decision</p>
          </div>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="rounded-md border border-line bg-white px-3 py-1.5 text-[12px] text-ink"
            aria-label="Chart range"
          >
            <option value="1">1 Year</option>
            <option value="3">3 Years</option>
            <option value="5">5 Years</option>
            <option value="all">All Time</option>
          </select>
        </div>
        <section aria-label="Historical interest rate trends" className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <BocChart
            points={months}
            decisions={decisions}
            range={range}
            visible={visible}
            onToggle={(k) => setVisible((v) => ({ ...v, [k]: !v[k] }))}
          />
        </section>
      </div>

      {/* Stats + timeline */}
      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <BlockHead eyebrow="Statistics" heading="Rate Summary" sub="Key statistics from recent changes" />
          <article className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <div className="grid grid-cols-3 gap-2">
              {[["Total Changes", stats?.total], ["Rate Holds", stats?.holds],
                ["Net Change", stats ? (stats.net > 0 ? "+" : "") + stats.net.toFixed(2) + "%" : null],
                ["Increases", stats?.ups], ["Decreases", stats?.downs],
                ["Total Decisions", stats?.totalDecisions]].map(([l, v]) => (
                <div key={l as string} className="rounded-lg bg-soft px-2 py-3 text-center">
                  <div className="text-[18px] font-bold text-ink">{v ?? <Skeleton w={40} h={20} />}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-wider text-muted">{l}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-line pt-2 text-[13px]">
              {[["Highest Rate", stats ? stats.high.toFixed(2) + "%" : null],
                ["Lowest Rate", stats ? stats.low.toFixed(2) + "%" : null],
                ["Current Target", fmtRate(target)],
                ["Current Prime", fmtRate(prime)],
                ["Days at Current Rate", stats ? `${stats.daysSteady} days` : null],
                ["Longest Hold Period", stats ? `${stats.longestHold} days` : null]].map(([l, v]) => (
                <div key={l as string} className="flex justify-between border-b border-line py-2">
                  <span className="text-muted">{l}</span>
                  <span className="font-semibold text-ink">{v ?? <Skeleton w={50} h={16} />}</span>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="lg:col-span-3">
          <BlockHead eyebrow="Decisions" heading="Rate Decision History" sub="All BoC rate decisions including holds & changes" />
          <article className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <style>{`.boc-thin-scroll{scrollbar-width:thin;scrollbar-color:#d1d5db transparent}.boc-thin-scroll::-webkit-scrollbar{width:6px}.boc-thin-scroll::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:3px}.boc-thin-scroll::-webkit-scrollbar-track{background:transparent}`}</style>
            <div className="boc-thin-scroll max-h-[460px] overflow-y-auto pr-6">
              {decisions.length === 0 && <div className="py-10 text-center text-[13px] text-muted">Loading…</div>}
              {decisions.slice(0, 60).map((d, i, arr) => (
                <div key={d.date + d.type} className="flex gap-3 border-b border-line pb-4">
                  <div className="flex flex-col items-center">
                    <div className={`h-3 w-3 rounded-full border-2 ${
                      d.type === "hold" ? "border-neutral-300 bg-neutral-100"
                      : d.direction === "up" ? "border-red-600 bg-red-200" : "border-emerald-600 bg-emerald-200"
                    }`} />
                    {i < arr.length - 1 && <div className="w-0.5 flex-1 bg-line" style={{ minHeight: 8 }} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`text-[14px] font-bold ${d.type === "hold" ? "text-muted" : "text-ink"}`}>
                        {(d.type === "hold" ? d.rate : d.newRate)?.toFixed(2)}%
                        {d.type === "hold" ? (
                          <span className="ml-2 rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-muted">Held</span>
                        ) : (
                          <span className={`ml-2 rounded px-2 py-0.5 text-[10px] font-semibold ${d.direction === "up" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                            {d.direction === "up" ? "▲ +" : "▼ −"}{d.change?.toFixed(2)}
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] text-muted">{fmtDate(d.date)}</span>
                    </div>
                    <div className="text-[11px] text-muted">
                      {d.type === "hold"
                        ? `Rate unchanged — held at ${d.rate?.toFixed(2)}%`
                        : `Changed from ${d.oldRate?.toFixed(2)}% to ${d.newRate?.toFixed(2)}%`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
