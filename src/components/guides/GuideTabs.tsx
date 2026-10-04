"use client";
/** Audience tabs + guide cards grid. Client-side filtering, no page reloads. */
import { useState } from "react";
import Link from "next/link";
import type { GuideMeta, AudienceMeta, GuideAudience } from "@/lib/guides/types";

type Tab = "All" | GuideAudience;

export function GuideTabs({
  guides,
  audiences,
  total,
}: {
  guides: GuideMeta[];
  audiences: AudienceMeta[];
  total: number;
}) {
  const [tab, setTab] = useState<Tab>("All");
  const visible = tab === "All" ? guides : guides.filter((g) => g.audience === tab);
  const countFor = (t: Tab) => (t === "All" ? total : guides.filter((g) => g.audience === t).length);

  const tabs: { key: Tab; label: string }[] = [
    { key: "All", label: `All Guides (${countFor("All")})` },
    ...audiences.map((a) => ({ key: a.audience as Tab, label: `${a.emoji} ${a.label} (${countFor(a.audience as Tab)})` })),
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-0 border-b-2 border-line">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-[2px] whitespace-nowrap border-b-[3px] border-transparent bg-transparent px-5 py-2.5 text-[13px] font-semibold transition ${
              tab === t.key ? "border-accent text-accent" : "text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((g) => {
          const aud = audiences.find((a) => a.audience === g.audience);
          return (
            <Link
              key={g.id}
              href={`/guides/${g.id}`}
              className="group relative flex flex-col overflow-hidden rounded-[var(--radius-md)] border border-line bg-white p-6 pb-5 shadow-[var(--shadow)] transition hover:-translate-y-1 hover:border-accent"
            >
              <span
                className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide"
                style={{ color: g.color, backgroundColor: `${g.color}14`, border: `1px solid ${g.color}33` }}
              >
                {g.tag}
              </span>
              <div
                className="mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-[14px] text-[26px] transition group-hover:scale-105"
                style={{ backgroundColor: aud?.bg ?? `${g.color}14` }}
                aria-hidden
              >
                {g.emoji}
              </div>
              <h3 className="mb-2 pr-4 text-[15px] font-bold leading-snug text-ink group-hover:text-accent">
                {g.title}
              </h3>
              <p className="mb-4 flex-1 text-[12.5px] leading-relaxed text-muted">{g.subtitle}</p>
              <span className="inline-flex items-center gap-1.5 self-start text-[12.5px] font-bold" style={{ color: g.color }}>
                Read Guide <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
              </span>
              <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path d="M7 17L17 7M9 7h8v8" /></svg>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
