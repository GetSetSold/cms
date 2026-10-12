"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Searchable multi-select city picker (matches public listings filter style).
 * Props: selected (string[]), onChange (string[]) 
 */
export function CityPicker({ selected, onChange }: { selected: string[]; onChange: (cities: string[]) => void }) {
  const [cities, setCities] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState<string[]>(selected);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/property-alerts/cities")
      .then((r) => r.json())
      .then((d) => setCities(d.cities ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setTemp(selected);
  }, [selected]);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filtered = query
    ? cities.filter((c) => c.toLowerCase().includes(query.toLowerCase()))
    : cities;

  function toggle(city: string) {
    setTemp((prev) => prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]);
  }

  function apply() {
    onChange(temp);
    setOpen(false);
  }

  const label = selected.length === 0 ? "City ▾" : selected.length === 1 ? selected[0] : `${selected.length} cities`;

  return (
    <div ref={ref} className="relative col-span-2">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full rounded border border-line bg-white px-3 py-2 text-left text-sm">
        {label}
      </button>
      {open ? (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-line bg-white shadow-lg">
          <div className="p-2">
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cities or areas..."
              className="w-full rounded border border-line px-3 py-2 text-sm" autoFocus />
          </div>
          <div className="max-h-64 overflow-y-auto px-2 pb-2">
            <button type="button" onClick={() => setTemp([])}
              className="block w-full px-3 py-2 text-left text-sm font-medium hover:bg-gray-50">
              All cities
            </button>
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted">No cities found</p>
            ) : filtered.slice(0, 100).map((city) => (
              <label key={city} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50">
                <input type="checkbox" checked={temp.includes(city)} onChange={() => toggle(city)}
                  className="h-4 w-4 rounded" />
                {city}
              </label>
            ))}
          </div>
          <div className="flex gap-2 border-t border-line p-2">
            <button type="button" onClick={apply}
              className="flex-1 rounded bg-[#111] px-4 py-2 text-sm font-medium text-white">
              Apply
            </button>
            <button type="button" onClick={() => { setTemp([]); setQuery(""); }}
              className="rounded border border-line px-4 py-2 text-sm">
              Clear
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
