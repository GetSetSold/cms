"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { PointsMap } from "./PointsMap";
import type { Project, Builder } from "@/lib/precon";

type ProjectWithBuilder = Project & { builder: Builder & { project_count?: number } };
type CityCount = { city: string; count: number };
type Stats = { projects: number; builders: number; cities: number; vip: number };

const card = "rounded-[var(--radius-lg)] border-[length:var(--border-card-width)] border-line shadow-[var(--shadow-card)] bg-white";
const PAGE_SIZE = 9;

export function PreconGridClient({
  projects, cities, builders, stats, showFilters, showStats, showMap,
}: { projects: ProjectWithBuilder[]; cities: CityCount[]; builders: (Builder & { project_count: number })[]; stats: Stats; showFilters: boolean; showStats: boolean; showMap: boolean }) {
  const [city, setCity] = useState("");
  const [status, setStatus] = useState("");
  const [vipOnly, setVipOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const statuses = useMemo(() => [...new Set(projects.map((p) => p.project_status).filter(Boolean))] as string[], [projects]);

  const filtered = useMemo(() => projects.filter((p) =>
    (!city || p.city === city) &&
    (!status || p.project_status === status) &&
    (!vipOnly || p.vip_release === "Yes"),
  ), [projects, city, status, vipOnly]);

  const visible = filtered.slice(0, visibleCount);
  const points = filtered.filter((p) => p.lat && p.lng).map((p) => ({ lat: p.lat!, lng: p.lng!, label: p.project_name, href: `/pre-construction/${p.builder.slug}/${p.slug}` }));
  const hasFilters = city || status || vipOnly;
  const clearAll = () => { setCity(""); setStatus(""); setVipOnly(false); };

  return (
    <div className="flex flex-col gap-10">
      {showStats ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[["Projects", stats.projects], ["Builders", stats.builders], ["Cities", stats.cities], ["VIP Releases", stats.vip]].map(([label, value]) => (
            <div key={label as string} className={`flex flex-col gap-1 p-4 text-center md:p-6 ${card}`}>
              <span className="text-2xl font-extrabold md:text-4xl">{value}</span>
              <span className="text-xs text-muted md:text-sm">{label}</span>
            </div>
          ))}
        </div>
      ) : null}

      {showFilters ? (
        <div className="flex flex-wrap items-center gap-2.5">
          <select className="input h-10 w-auto" value={city} onChange={(e) => { setCity(e.target.value); setVisibleCount(PAGE_SIZE); }}>
            <option value="">All Cities</option>
            {cities.map((c) => <option key={c.city} value={c.city}>{c.city} ({c.count})</option>)}
          </select>
          <select className="input h-10 w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setVisibleCount(PAGE_SIZE); }}>
            <option value="">All Status</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <label className="flex h-10 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-sm">
            <input type="checkbox" checked={vipOnly} onChange={(e) => { setVipOnly(e.target.checked); setVisibleCount(PAGE_SIZE); }} /> VIP only
          </label>
          {hasFilters ? <button onClick={clearAll} className="text-sm font-medium text-primary">Clear All Filters</button> : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p) => (
          <Link key={p.id} href={`/pre-construction/${p.builder.slug}/${p.slug}`} prefetch={false} className={`flex flex-col overflow-hidden ${card}`}>
            <div className="relative aspect-[4/3] bg-soft">
              {p.main_image_url ? <img src={p.main_image_url} alt={p.project_name} className="h-full w-full object-cover" /> : null}
              {p.project_status ? <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-white">{p.project_status}</span> : null}
              {p.vip_release === "Yes" ? <span className="absolute right-3 top-3 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">VIP</span> : null}
            </div>
            <div className="flex flex-col gap-1 p-4">
              <div className="text-base font-bold text-primary md:text-lg">{p.p_start_price ? `From $${Number(p.p_start_price).toLocaleString()}` : "Price TBA"}</div>
              <div className="text-sm font-medium">{p.project_name}</div>
              <div className="text-xs text-muted">{p.builder.builder_name} · {p.city}</div>
            </div>
          </Link>
        ))}
      </div>
      {!filtered.length ? <p className="text-center text-muted">No projects match your filters. Try adjusting your search.</p> : null}
      {visibleCount < filtered.length ? (
        <button onClick={() => setVisibleCount((c) => c + PAGE_SIZE)} className="mx-auto flex h-11 items-center rounded-full border border-ink px-6 text-sm font-medium">Load More Projects</button>
      ) : null}

      {cities.length ? (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-bold md:text-2xl">Browse by City</h3>
          <div className="flex flex-wrap gap-2">
            {cities.map((c) => (
              <button key={c.city} onClick={() => { setCity(c.city); setVisibleCount(PAGE_SIZE); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className={`flex h-9 items-center rounded-full px-4 text-sm font-medium ${city === c.city ? "bg-primary text-white" : "border border-line bg-white"}`}>
                {c.city} ({c.count})
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {builders.length ? (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-bold md:text-2xl">Featured Builders</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {builders.map((b) => (
              <Link key={b.slug} href={`/pre-construction/${b.slug}`} prefetch={false} className={`flex flex-col items-center gap-2 p-4 text-center ${card}`}>
                {b.logo_url ? <img src={b.logo_url} alt={b.builder_name} className="h-8 w-auto object-contain" /> : <span className="font-bold">{b.builder_name}</span>}
                <span className="text-xs text-muted">{b.project_count} project{b.project_count === 1 ? "" : "s"}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {showMap && points.length ? (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-bold md:text-2xl">Explore All Communities</h3>
          <div className="h-80 md:h-[460px]"><PointsMap points={points} /></div>
        </div>
      ) : null}
    </div>
  );
}
