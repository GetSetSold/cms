"use client";
import { useEffect, useState } from "react";

interface WalkScoreData {
  walkscore: number | null;
  description: string | null;
  transit: { score: number; description: string } | null;
  bike: { score: number; description: string } | null;
}

const CACHE_TTL = 90 * 24 * 60 * 60 * 1000; // 90 days — scores barely change

function ringColor(score: number) {
  if (score >= 70) return "bg-ink text-white";
  if (score >= 50) return "bg-accent text-white";
  return "bg-[#999] text-white";
}

function DirectionsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  );
}

function Buttons({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[12px] font-semibold text-white"
      >
        <DirectionsIcon />
        Get Directions
      </a>
    </div>
  );
}

/**
 * Walk/Transit/Bike scores + buttons inside the Map & Directions block.
 * Scores fetch via /api/walk-score (key stays server-side), cached 90 days in
 * localStorage. Buttons always render; scores + About button only with data.
 */
export function WalkScoreBadges({ lat, lng }: { lat: number; lng: number }) {
  const [data, setData] = useState<WalkScoreData | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const cacheKey = `ws-${lat.toFixed(3)}-${lng.toFixed(3)}`;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const { expires, data: cached } = JSON.parse(raw);
        if (expires > Date.now() && cached?.walkscore != null) {
          setData(cached);
          setDone(true);
          return;
        }
      }
    } catch { /* ignore */ }

    let cancelled = false;
    fetch(`/api/walk-score?lat=${lat}&lng=${lng}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: WalkScoreData | null) => {
        if (cancelled) return;
        setDone(true);
        if (!d || d.walkscore == null) return;
        setData(d);
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ expires: Date.now() + CACHE_TTL, data: d }));
        } catch { /* ignore */ }
      })
      .catch(() => { if (!cancelled) setDone(true); });
    return () => { cancelled = true; };
  }, [lat, lng]);

  const items = data
    ? ([
        { label: "Walk Score", score: data.walkscore, desc: data.description },
        data.transit ? { label: "Transit Score", score: data.transit.score, desc: data.transit.description } : null,
        data.bike ? { label: "Bike Score", score: data.bike.score, desc: data.bike.description } : null,
      ].filter(Boolean) as { label: string; score: number; desc: string | null }[])
    : [];
  const hasScores = items.length > 0;

  // Before the fetch resolves, show just the directions button (no layout shift for scores).
  if (!done) {
    return (
      <div className="border-t border-line px-6 py-5">
        <Buttons lat={lat} lng={lng} />
      </div>
    );
  }

  return (
    <div className="border-t border-line px-6 py-5">
      {hasScores ? (
        <>
          {/* Desktop: inline strip */}
          <div className="hidden items-center gap-5 md:flex">
            {items.map((it, i) => (
              <div key={it.label} className="flex items-center gap-5">
                {i > 0 ? <div className="h-7 w-px bg-line" /> : null}
                <div className="flex items-center gap-2.5">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold ${ringColor(it.score)}`}>
                    {it.score}
                  </span>
                  <span className="text-[13px]">
                    <span className="font-bold">{it.label}</span>
                    {it.desc ? <span className="text-muted"> · {it.desc}</span> : null}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {/* Mobile: table rows like the other blocks */}
          <table className="w-full md:hidden">
            <tbody>
              {items.map((it, i) => (
                <tr key={it.label} className={i > 0 ? "border-t border-line" : ""}>
                  <td className="py-3.5 pr-3">
                    <div className="text-[0.9rem] font-bold text-ink">{it.label}</div>
                    {it.desc ? <div className="text-[12px] text-muted">{it.desc}</div> : null}
                  </td>
                  <td className="w-14 py-3.5 text-right">
                    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-bold ${ringColor(it.score)}`}>
                      {it.score}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
      <div className={hasScores ? "mt-4" : ""}>
        <Buttons lat={lat} lng={lng} />
      </div>
      {hasScores ? (
        <p className="mt-3 text-[11px] text-muted">
          Scores by <a href="https://www.walkscore.com/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Walk Score</a>
        </p>
      ) : null}
    </div>
  );
}
