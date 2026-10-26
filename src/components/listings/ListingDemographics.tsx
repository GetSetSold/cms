"use client";
import { useEffect, useState } from "react";

const API = "https://demographics.rohit-910.workers.dev/api/demographics";

type DemoData = {
  demographics?: Record<string, any>;
  census_year?: string;
  city_name?: string;
  postal_code?: string;
  geography_name?: string;
  geo_type?: string;
  error?: string;
};

// Restrained blue palette matching site
const COLORS = ["#0099cc", "#4db8db", "#80cce6", "#b3e0f0", "#d6eff7", "#e8f6fa"];

function Donut({ data }: { data: { label: string; val: number }[] }) {
  const cx = 110, cy = 110, r = 80, inner = 52;
  let angle = -90;
  const total = data.reduce((s, d) => s + d.val, 0) || 1;
  const paths = data.map((d, i) => {
    const frac = d.val / total;
    const a1 = angle, a2 = angle + frac * 360;
    const large = a2 - a1 > 180 ? 1 : 0;
    const rad = (a: number) => (a * Math.PI) / 180;
    const x1 = cx + r * Math.cos(rad(a1)), y1 = cy + r * Math.sin(rad(a1));
    const x2 = cx + r * Math.cos(rad(a2)), y2 = cy + r * Math.sin(rad(a2));
    const xi1 = cx + inner * Math.cos(rad(a2)), yi1 = cy + inner * Math.sin(rad(a2));
    const xi2 = cx + inner * Math.cos(rad(a1)), yi2 = cy + inner * Math.sin(rad(a1));
    angle = a2;
    return (
      <path key={i}
        d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi1} ${yi1} A ${inner} ${inner} 0 ${large} 0 ${xi2} ${yi2} Z`}
        fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth={2} />
    );
  });
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <svg width={220} height={220} viewBox="0 0 220 220" className="shrink-0">
        {paths}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={13} fill="#888">Total</text>
        <text x={cx} y={cy + 18} textAnchor="middle" fontSize={20} fontWeight={700} fill="#1a1a1a">100%</text>
      </svg>
      <div className="flex min-w-[180px] flex-col gap-2 text-[13px]">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-[3px]" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-muted">{d.label}</span>
            <span className="ml-auto font-semibold pl-3">{d.val}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-line bg-soft px-3 py-4 text-center">
      <div className="text-[22px] font-bold leading-tight">{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}

// Black SVG icons
const ICONS: Record<string, React.ReactNode> = {
  family: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  work: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>,
  car: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" /><path d="M3 11h18a1 1 0 0 1 1 1v4h-2" /><path d="M5 16H3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1" /><circle cx="7.5" cy="16" r="1.5" /><circle cx="16.5" cy="16" r="1.5" /><path d="M9 16h6" /></svg>,
  money: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
};

function Insight({ icon, children }: { icon: keyof typeof ICONS; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-[#f8faff] p-3.5 text-sm leading-relaxed">
      <span className="mt-0.5 h-5 w-5 shrink-0 text-ink">{ICONS[icon]}</span>
      <span className="text-muted"><strong className="text-ink">{children}</strong></span>
    </div>
  );
}

const fmtInt = (v: any) => v != null ? Number(v).toLocaleString("en-CA") : "—";
const fmtMoney = (v: any) => v != null ? "$" + Math.round(Number(v) / 1000) + "k" : "—";
const fmtPct = (v: any) => v != null ? Number(v).toFixed(0) + "%" : "—";
const fmt1d = (v: any) => v != null ? Number(v).toFixed(1) : "—";

function toDonut(items: any[]): { label: string; val: number }[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((i) => (i.pct > 0 || i.count > 0))
    .slice(0, 6)
    .map((i) => ({ label: i.label, val: Math.round(Number(i.pct) || 0) }))
    .filter((i) => i.val > 0);
}

export function ListingDemographics({ postalCode, city }: { postalCode?: string | null; city?: string | null }) {
  const [data, setData] = useState<DemoData | null>(null);
  const [tab, setTab] = useState("overview");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      // Try postal (DA-level) first, fall back to city
      const queries: string[] = [];
      if (postalCode) queries.push(`${API}?postal=${encodeURIComponent(postalCode.replace(/\s/g, ""))}`);
      if (city) queries.push(`${API}?city=${encodeURIComponent(city)}&prov=ON`);

      for (const url of queries) {
        try {
          const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
          if (!r.ok) continue;
          const j = await r.json();
          if (j.error || !j.demographics) continue;
          if (!cancelled) setData(j);
          return;
        } catch { /* try next */ }
      }
      if (!cancelled) setFailed(true);
    }
    load();
    return () => { cancelled = true; };
  }, [postalCode, city]);

  if (failed || !data?.demographics) return null;

  const d = data.demographics;
  const year = data.census_year || "2021";
  const isCity = data.geo_type === "csd" || (!data.postal_code && !!data.city_name);
  const geoLabel = isCity
    ? `${data.city_name || city || "Area"}`
    : `Dissemination Area near ${data.postal_code ? data.postal_code.replace(/(.{3})(.{3})/, "$1 $2") : "this listing"}`;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "income", label: "Income" },
    { id: "age", label: "Age" },
    { id: "housing", label: "Housing" },
    { id: "commute", label: "Commute" },
  ];

  return (
    <div className="border-b border-line bg-white last:border-b-0 lg:overflow-hidden lg:rounded-[var(--radius-lg)] lg:border-b-0">
      <div className="border-b border-line px-6 py-4">
        <h2 className="font-display text-[1.0rem]">Neighbourhood Demographics</h2>
        <p className="mt-1 text-[13px] text-muted">
          {isCity ? `City-level data for ${geoLabel}` : `${geoLabel} — approx. 400–700 residents`}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 px-6 pt-4">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`rounded-[var(--radius-btn,999px)] px-4 py-2 text-[13px] font-medium transition-colors ${tab === t.id ? "bg-ink text-white" : "bg-soft text-muted hover:text-ink"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-6 py-5">
        {tab === "overview" && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat value={fmtInt(d.population_2021)} label="Population" />
              <Stat value={fmt1d(d.average_age)} label="Avg Age" />
              <Stat value={fmtMoney(d.median_household_income)} label="Median Income" />
              <Stat value={fmtPct(d.homeowners_pct ?? (d.renters_pct != null ? 100 - Number(d.renters_pct) : null))} label="Homeowners" />
            </div>
            <div className="flex flex-col gap-2.5">
              {d.avg_household_size ? (
                <Insight icon="family">Family area. <span className="font-normal">Average household size of {fmt1d(d.avg_household_size)}{Number(d.avg_household_size) >= 2.5 ? " — typical of neighbourhoods with young families." : "."}</span></Insight>
              ) : null}
              {d.median_household_income ? (
                <Insight icon="money">Income levels. <span className="font-normal">Median household income of {fmtMoney(d.median_household_income)}/yr{Number(d.median_household_income) >= 90000 ? " — a solid middle-to-upper income area." : "."}</span></Insight>
              ) : null}
            </div>
          </div>
        )}

        {tab === "income" && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat value={fmtMoney(d.median_household_income)} label="Median HH Income" />
              <Stat value={fmtMoney(d.avg_household_income)} label="Average HH Income" />
              <Stat value={fmtMoney(d.median_family_income)} label="Median Family Income" />
            </div>
            {toDonut(d.income_brackets).length ? <Donut data={toDonut(d.income_brackets)} /> : null}
          </div>
        )}

        {tab === "age" && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Stat value={fmt1d(d.average_age)} label="Average Age" />
              <Stat value={fmt1d(d.avg_household_size)} label="Avg Household Size" />
            </div>
            {toDonut(d.age_distribution).length ? <Donut data={toDonut(d.age_distribution)} /> : null}
            {d.average_age ? (
              <Insight icon="family">{Number(d.average_age) < 40 ? "Younger area. " : "Established area. "}<span className="font-normal">Average age of {fmt1d(d.average_age)} suggests {Number(d.average_age) < 40 ? "young families and first-time buyers." : "a mix of established households."}</span></Insight>
            ) : null}
          </div>
        )}

        {tab === "housing" && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat value={fmtPct(d.homeowners_pct ?? (d.renters_pct != null ? 100 - Number(d.renters_pct) : null))} label="Homeowners" />
              <Stat value={fmtPct(d.renters_pct)} label="Renters" />
              <Stat value={d.avg_construction_year ? String(d.avg_construction_year) : "—"} label="Avg Build Year" />
            </div>
            {toDonut(d.housing_breakdown).length ? <Donut data={toDonut(d.housing_breakdown)} /> : null}
            {d.renters_pct != null ? (
              <Insight icon="home">{Number(d.renters_pct) < 30 ? "Ownership-heavy. " : "Mixed ownership. "}<span className="font-normal">{fmtPct(100 - Number(d.renters_pct))} own their homes — {Number(d.renters_pct) < 30 ? "a sign of neighbourhood stability." : "a balanced mix of owners and renters."}</span></Insight>
            ) : null}
          </div>
        )}

        {tab === "commute" && (
          <div className="flex flex-col gap-4">
            {toDonut(d.commute_breakdown).length ? (
              <Donut data={toDonut(d.commute_breakdown)} />
            ) : (
              <p className="text-sm text-muted">Commute data not available for this area.</p>
            )}
            <Insight icon="car">Check your commute. <span className="font-normal">Most residents drive — verify transit options and drive times to your workplace before committing.</span></Insight>
          </div>
        )}
      </div>

      <div className="border-t border-line px-6 py-3 text-[11px] text-muted">
        Source: Statistics Canada — {year} Census · {isCity ? "City level" : "Dissemination Area level"}
      </div>
    </div>
  );
}
