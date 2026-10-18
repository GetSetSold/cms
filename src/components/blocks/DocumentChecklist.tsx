"use client";

import { useState } from "react";
import Link from "next/link";

interface DocButton {
  label?: string;
  href?: string;
}

interface DocItem {
  title?: string;
  note?: string;
  buttons?: DocButton[];
}

interface DocTab {
  label?: string;
  items?: DocItem[];
}

interface DocumentChecklistData {
  eyebrow?: string;
  heading?: string;
  intro?: string;
  tabs?: DocTab[];
  tip?: string;
}

function CheckIcon() {
  return (
    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-ink">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

function ArrowIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default function DocumentChecklist({ data }: { data: DocumentChecklistData }) {
  const tabs = (data.tabs ?? []).filter((t) => t.label);
  const [active, setActive] = useState(0);
  const current = tabs[Math.min(active, tabs.length - 1)];

  return (
    <div className="mx-auto w-full max-w-7xl px-5 md:px-10">
        {data.eyebrow ? (
          <div className="mb-2 text-[13px] font-bold uppercase tracking-[0.06em] text-primary">{data.eyebrow}</div>
        ) : null}
        {data.heading ? (
          <h2 className="mb-3 text-2xl font-bold leading-tight md:text-[32px]">{data.heading}</h2>
        ) : null}
        {data.intro ? (
          <p className="mb-7 max-w-3xl text-[15px] leading-relaxed text-muted md:text-base">{data.intro}</p>
        ) : null}

        {tabs.length > 0 ? (
          <>
            <div className="mb-6 overflow-x-auto">
              <div className="inline-flex min-w-full items-center gap-1 rounded-[var(--radius-btn)] border border-line bg-white p-1.5 sm:min-w-0" role="tablist" aria-label="Document categories">
                {tabs.map((t, i) => (
                  <button
                    key={i}
                    role="tab"
                    aria-selected={i === active}
                    onClick={() => setActive(i)}
                    className={`whitespace-nowrap rounded-[var(--radius-btn)] px-4 py-2 text-sm ${
                      i === active
                        ? "bg-ink font-semibold text-white"
                        : "font-medium text-muted hover:text-ink"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-[12px] border border-line bg-white px-5 py-2 md:px-7 md:py-3">
              {(current?.items ?? []).map((item, i) => (
                <div key={i} className="flex gap-3.5 border-b border-line py-4 last:border-b-0">
                  <CheckIcon />
                  <div className="min-w-0">
                    {item.title ? <div className="mb-1 text-base font-semibold">{item.title}</div> : null}
                    {item.note ? <div className="text-sm text-muted">{item.note}</div> : null}
                    {(item.buttons ?? []).filter((b) => b.label).length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-3">
                        {(item.buttons ?? [])
                          .filter((b) => b.label)
                          .map((b, j) =>
                            b.href ? (
                              <Link
                                key={j}
                                href={b.href}
                                className="inline-flex items-center gap-2 rounded-[var(--radius-btn,999px)] bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary"
                              >
                                {b.label} <ArrowIcon />
                              </Link>
                            ) : (
                              <span
                                key={j}
                                className="inline-flex items-center gap-2 rounded-[var(--radius-btn,999px)] bg-ink px-6 py-3 text-sm font-semibold text-white"
                              >
                                {b.label} <ArrowIcon />
                              </span>
                            )
                          )}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {data.tip ? (
          <div className="mt-6 rounded-[10px] bg-primary-soft px-5 py-4 text-sm leading-relaxed text-muted">
            <strong className="text-ink">Tip:</strong> {data.tip}
          </div>
        ) : null}
    </div>
  );
}
