"use client";

import { useState } from "react";
import { CardArrowButton } from "@/components/site/CardArrowButton";

export interface ProvinceCity {
  city: string;
  slug: string;
  count: number;
}

/** Header + live city filter for the province hub. Type to narrow the
 *  600+ city grid instantly (client-side, no reload). */
export function ProvinceCityExplorer({
  cities,
  totalListings,
}: {
  cities: ProvinceCity[];
  totalListings: number;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q ? cities.filter((c) => c.city.toLowerCase().includes(q)) : cities;

  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">Ontario Real Estate &amp; MLS® Listings</h1>
          <p className="mt-3 max-w-3xl leading-relaxed text-muted">
            Browse {totalListings.toLocaleString()} active MLS® listings across Ontario. Select a city
            below to see homes for sale and rent, live market stats, and local market FAQs.
          </p>
        </div>
        <div className="relative shrink-0 md:w-72">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cities..."
            aria-label="Search cities"
            className="w-full rounded-[var(--radius-md)] border border-line bg-white py-2.5 pl-10 pr-4 text-sm outline-none placeholder:text-muted focus:border-primary"
          />
        </div>
      </div>

      {q ? (
        <p className="mt-4 text-sm text-muted">
          {filtered.length === 1
            ? "1 city"
            : `${filtered.length.toLocaleString()} cities`}{" "}
          matching &ldquo;{query.trim()}&rdquo;
        </p>
      ) : null}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <a
            key={c.slug}
            href={`/${c.slug}-real-estate`}
            className="group relative rounded-[var(--radius-lg)] bg-white p-6 pr-16 transition hover:shadow-[var(--shadow-card)]"
          >
            <div className="font-display text-xl">{c.city} Real Estate</div>
            <div className="mt-1 text-sm text-muted">{c.count.toLocaleString()} active listings</div>
            <CardArrowButton />
          </a>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 rounded-[var(--radius-lg)] bg-white p-6 text-center text-muted">
          No cities match &ldquo;{query.trim()}&rdquo;. Try another search.
        </p>
      ) : null}
    </>
  );
}
