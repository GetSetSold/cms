"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BOC_API, BOC_SERIES, BOC_SCHEDULE,
  fmtRate, fmtDate, nextBocDecision, bocChanges, type BocChange,
} from "@/lib/boc";

interface Rates { target: number|null; bank: number|null; prime: number|null; corra: number|null; bond5y: number|null; }
interface BankRates { bankPrime: number|null; mtg1yr: number|null; mtg3yr: number|null; mtg5yr: number|null; }

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

function RateCard({ label, value, sub, accent, loading, badge }: {
  label: string; value: string; sub: string; accent: string; loading: boolean; badge?: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-white px-4 py-5 text-center shadow-sm">
      <div className="absolute left-0 right-0 top-0 h-1" style={{ background: accent }} />
      <span className="mb-1 text-[11px] font-medium uppercase tracking-wider text-neutral-500">{label}</span>
      <div className="text-[28px] font-bold leading-tight text-primary">
        {loading ? <Skeleton /> : value}
      </div>
      {badge}
      <span className="mt-1 text-[11px] text-neutral-400">{sub}</span>
    </div>
  );
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
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff / 3600000) % 24);
  const m = Math.floor((diff / 60000) % 60);
  const s = Math.floor((diff / 1000) % 60);
  return { next, parts: { d, h, m, s } };
}

export function BocTracker() {
  const [rates, setRates] = useState<Rates | null>(null);
  const [banks, setBanks] = useState<BankRates | null>(null);
  const [history, setHistory] = useState<{ date: string; value: number | null }[]>([]);
  const [range, setRange] = useState<"1" | "3" | "5" | "all">("3");
  const { next, parts } = useCountdown();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cur = await fetch(
          `${BOC_API}/observations/${BOC_SERIES.TARGET},${BOC_SERIES.BANK},${BOC_SERIES.PRIME},${BOC_SERIES.CORRA},${BOC_SERIES.BOND_5YR}/json?recent=10`
        ).then((r) => r.json());
        const obs = cur.observations || [];
        const r: Rates = {
          target: latestVal(obs, BOC_SERIES.TARGET),
          bank: latestVal(obs, BOC_SERIES.BANK),
          prime: latestVal(obs, BOC_SERIES.PRIME),
          corra: latestVal(obs, BOC_SERIES.CORRA),
          bond5y: latestVal(obs, BOC_SERIES.BOND_5YR),
        };
        if (alive) setRates(r);
      } catch { /* leave skeletons */ }
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
      } catch { /* leave skeletons */ }
      try {
        const hist = await fetch(
          `${BOC_API}/observations/${BOC_SERIES.TARGET}/json?start_date=2010-01-01&order_dir=asc`
        ).then((r) => r.json());
        const list = (hist.observations || []).map((o: any) => {
          const v = o?.[BOC_SERIES.TARGET];
          return { date: o.d, value: v && typeof v === "object" && "v" in v ? parseFloat(v.v) : null };
        });
        if (alive) setHistory(list);
      } catch { /* chart/stats stay empty */ }
    })();
    return () => { alive = false; };
  }, []);

  const changes = useMemo(() => bocChanges(history), [history]);

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
    return {
      total: changes.length, ups, downs, net,
      high: Math.max(...allR), low: Math.min(...allR),
      daysSteady, longestHold: longest,
    };
  }, [changes]);

  // Monthly-downsampled chart series for the selected range
  const chartPts = useMemo(() => {
    const years = range === "all" ? 99 : parseInt(range);
    const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - years);
    const map = new Map<string, number>();
    for (const o of history) {
      if (o.value === null) continue;
      if (new Date(o.date + "T00:00:00") < cutoff) continue;
      map.set(o.date.substring(0, 7), o.value);
    }
    return Array.from(map.entries()).map(([m, v]) => ({ m, v }));
  }, [history, range]);

  const loading = rates === null;
  const target = rates?.target ?? null;
  const stress = target !== null ? Math.max(target + 2, 5.25) : null;
  const prime = banks?.bankPrime ?? rates?.prime ?? null;

  const lastChange: BocChange | null = changes.length > 0 ? changes[changes.length - 1] : null;
  const badge = lastChange ? (
    <span className={`mt-1 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold ${lastChange.direction === "up" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
      {lastChange.direction === "up" ? "▲" : "▼"} {lastChange.direction === "up" ? "+" : "−"}{lastChange.change.toFixed(2)}%
    </span>
  ) : undefined;

  const chartMax = chartPts.length ? Math.max(...chartPts.map((p) => p.v)) + 0.4 : 6;
  const chartMin = chartPts.length ? Math.min(...chartPts.map((p) => p.v)) - 0.4 : 0;
  const W = 720, H = 220;
  const px = (i: number) => 46 + (i * (W - 62)) / Math.max(1, chartPts.length - 1);
  const py = (v: number) => 14 + ((chartMax - v) * (H - 52)) / Math.max(0.01, chartMax - chartMin);
  const line = chartPts.map((p, i) => `${px(i).toFixed(0)},${py(p.v).toFixed(0)}`).join(" ");

  return (
    <div>
      {/* Rate cards */}
      <section aria-label="Current Bank of Canada interest rates" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <RateCard label="Target Overnight Rate" value={fmtRate(target)} sub="Key policy rate" accent="#111111" loading={loading} badge={badge} />
        <RateCard label="Bank Rate" value={fmtRate(rates?.bank ?? null)} sub="Target + 0.25%" accent="#1A6B8A" loading={loading} />
        <RateCard label="Prime Rate" value={fmtRate(prime)} sub="Major bank prime" accent="#2E86AB" loading={loading} />
        <RateCard label="CORRA" value={fmtRate(rates?.corra ?? null)} sub="Overnight repo rate avg" accent="#4EA8C8" loading={loading} />
        <RateCard label="OSFI Stress Test Rate" value={fmtRate(stress)} sub={target !== null ? `max(${target.toFixed(2)}% + 2%, 5.25%)` : "max(BoC + 2%, 5.25%)"} accent="#7c3aed" loading={loading} />
        <RateCard label="5-Year Bond Yield" value={fmtRate(rates?.bond5y ?? null)} sub="GoC benchmark yield" accent="#ea580c" loading={loading} />
      </section>

      {/* Banks */}
      <section aria-label="Major bank prime rates" className="mt-5 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-[15px] font-semibold text-ink">Major Bank Prime Rates</h2>
        <p className="mb-4 text-[11px] text-neutral-400">Posted prime rates from Canada&apos;s Big 5 banks — all follow the BoC policy rate</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {[["RBC", "#003168"], ["TD", "#34a853"], ["Scotiabank", "#ec111a"], ["BMO", "#0075ca"], ["CIBC", "#8b1a4a"]].map(([name, color]) => (
            <div key={name} className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-4 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg text-[13px] font-bold text-white" style={{ background: color }}>
                {name === "Scotiabank" ? "Sco" : name.slice(0, 3)}
              </div>
              <div className="text-[12px] font-semibold text-neutral-700">{name === "Scotiabank" ? "Scotiabank" : name}</div>
              <div className="text-[20px] font-bold text-primary">{banks === null ? <Skeleton w={60} h={24} /> : fmtRate(prime)}</div>
              <div className="text-[10px] text-neutral-400">Prime Rate</div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 border-t border-neutral-200 pt-4 sm:grid-cols-3">
          {[["Posted 1-Year Fixed", banks?.mtg1yr], ["Posted 3-Year Fixed", banks?.mtg3yr], ["Posted 5-Year Fixed", banks?.mtg5yr]].map(([label, v]) => (
            <div key={label as string} className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
              <div className="mt-1 text-[20px] font-bold text-accent">{banks === null ? <Skeleton w={70} h={22} /> : fmtRate(v as number | null)}</div>
              <div className="text-[10px] text-neutral-400">Conventional mortgage</div>
            </div>
          ))}
        </div>
      </section>

      {/* Countdown */}
      <section aria-label="Next Bank of Canada rate decision" className="mt-5 rounded-lg border border-neutral-200 bg-white p-5 text-center shadow-sm">
        <div className="text-[13px] font-semibold text-ink">Next Rate Decision</div>
        {next && parts ? (
          <>
            <div className="mb-3 text-[12px] text-neutral-500">{fmtDate(next)} at 09:45 ET</div>
            <div className="flex justify-center gap-2">
              {[["Days", parts.d], ["Hours", parts.h], ["Min", parts.m], ["Sec", parts.s]].map(([u, v]) => (
                <div key={u as string} className="flex flex-col items-center">
                  <div className="min-w-[52px] rounded-lg bg-primary px-3 py-2 text-[22px] font-bold tabular-nums text-white">
                    {String(v).padStart(2, "0")}
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-wider text-neutral-400">{u}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-[13px] text-neutral-500">Next decision schedule to be announced — check bankofcanada.ca</div>
        )}
      </section>

      {/* Chart */}
      <section aria-label="Historical interest rate trends" className="mt-5 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Historical Rate Trends</h2>
            <p className="text-[12px] text-neutral-400">Target overnight rate, monthly</p>
          </div>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as any)}
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-[12px] text-ink"
            aria-label="Chart range"
          >
            <option value="1">1 Year</option>
            <option value="3">3 Years</option>
            <option value="5">5 Years</option>
            <option value="all">All Time</option>
          </select>
        </div>
        {chartPts.length > 1 ? (
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Historical Bank of Canada policy rate chart">
            {[1, 2, 3, 4, 5].map((g) => g <= chartMax && g >= chartMin ? (
              <g key={g}>
                <line x1="46" y1={py(g)} x2={W - 16} y2={py(g)} stroke="#e5e5e5" />
                <text x="40" y={py(g) + 4} fontSize="10" fill="#333" textAnchor="end">{g}%</text>
              </g>
            ) : null)}
            <polyline points={line} fill="none" stroke="var(--c-primary,#111111)" strokeWidth="2" />
            {chartPts.map((p, i) => i % Math.ceil(chartPts.length / 8) === 0 ? (
              <text key={p.m} x={px(i)} y={H - 8} fontSize="10" fill="#333" textAnchor="middle">
                {new Date(p.m + "-01T00:00:00").toLocaleDateString("en-CA", { month: "short", year: "2-digit" })}
              </text>
            ) : null)}
            {chartPts.length > 0 && (
              <g>
                <circle cx={px(chartPts.length - 1)} cy={py(chartPts[chartPts.length - 1].v)} r="4.5" fill="var(--c-primary,#111111)" />
                <text x={px(chartPts.length - 1) - 8} y={py(chartPts[chartPts.length - 1].v) - 12} fontSize="12" fontWeight="700" fill="#111" textAnchor="end">
                  {chartPts[chartPts.length - 1].v.toFixed(2)}%
                </text>
              </g>
            )}
          </svg>
        ) : (
          <div className="flex h-40 items-center justify-center text-[13px] text-neutral-400">Loading chart…</div>
        )}
      </section>

      {/* Stats + timeline */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <article className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-[14px] font-semibold text-ink">Rate Summary</h2>
          <p className="mb-4 text-[11px] text-neutral-400">Key statistics since 2010</p>
          <div className="grid grid-cols-3 gap-2">
            {[["Total Changes", stats?.total], ["Net Change", stats ? (stats.net > 0 ? "+" : "") + stats.net.toFixed(2) + "%" : null],
              ["Increases", stats?.ups], ["Decreases", stats?.downs],
              ["Highest", stats ? stats.high.toFixed(2) + "%" : null], ["Lowest", stats ? stats.low.toFixed(2) + "%" : null]].map(([l, v]) => (
              <div key={l as string} className="rounded-lg bg-neutral-50 px-2 py-3 text-center">
                <div className="text-[18px] font-bold text-ink">{v ?? <Skeleton w={40} h={20} />}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-neutral-400">{l}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2 border-t border-neutral-200 pt-4 text-[13px]">
            {[["Current Target", fmtRate(target)], ["Current Prime", fmtRate(prime)],
              ["Days at Current Rate", stats ? `${stats.daysSteady} days` : null],
              ["Longest Hold Period", stats ? `${stats.longestHold} days` : null]].map(([l, v]) => (
              <div key={l as string} className="flex justify-between">
                <span className="text-neutral-500">{l}</span>
                <span className="font-semibold text-ink">{v ?? <Skeleton w={50} h={16} />}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm lg:col-span-3">
          <h2 className="text-[14px] font-semibold text-ink">Rate Decision History</h2>
          <p className="mb-4 text-[11px] text-neutral-400">BoC rate changes since 2010</p>
          <div className="max-h-[420px] space-y-0 overflow-y-auto pr-1">
            {changes.length === 0 && <div className="py-10 text-center text-[13px] text-neutral-400">Loading…</div>}
            {[...changes].reverse().slice(0, 40).map((c, i, arr) => (
              <div key={c.date} className="flex gap-3 pb-4">
                <div className="flex flex-col items-center">
                  <div className={`h-3 w-3 rounded-full border-2 ${c.direction === "up" ? "border-red-600 bg-red-200" : "border-emerald-600 bg-emerald-200"}`} />
                  {i < arr.length - 1 && <div className="w-0.5 flex-1 bg-neutral-200" style={{ minHeight: 8 }} />}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[14px] font-bold text-ink">
                      {c.newRate.toFixed(2)}%
                      <span className={`ml-2 rounded px-2 py-0.5 text-[10px] font-semibold ${c.direction === "up" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                        {c.direction === "up" ? "▲ +" : "▼ −"}{c.change.toFixed(2)}
                      </span>
                    </span>
                    <span className="text-[11px] text-neutral-400">{fmtDate(c.date)}</span>
                  </div>
                  <div className="text-[11px] text-neutral-500">Changed from {c.oldRate.toFixed(2)}% to {c.newRate.toFixed(2)}%</div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
