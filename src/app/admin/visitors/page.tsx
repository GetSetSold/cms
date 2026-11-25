import { requireStaff } from "@/lib/auth";
import { VisitorsAutoRefresh } from "@/components/admin/VisitorsAutoRefresh";

/**
 * Admin → Visitors — the SalesIQ LiveView replacement.
 * Reads public.visitor_events (written by the site's VisitorTracker).
 * "Live now" = a session with a page view in the last 5 minutes.
 * Everything else is the last 24 hours. Auto-refreshes every 30s.
 */

type Event = {
  session_id: string;
  path: string;
  referrer: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  device: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  created_at: string;
};

type Session = {
  id: string;
  first: number;
  last: number;
  pages: string[];
  device: string | null;
  source: string;
  location: string;
};

const LIVE_MS = 5 * 60_000;

function sourceOf(e: Event): string {
  if (e.utm_source) return e.utm_campaign ? `${e.utm_source} / ${e.utm_campaign}` : e.utm_source;
  if (e.referrer) {
    try {
      return new URL(e.referrer).hostname.replace(/^www\./, "");
    } catch {
      return "Referral";
    }
  }
  return "Direct";
}

function ago(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.round(m / 60)} h ago`;
}

function duration(ms: number): string {
  const m = Math.round(ms / 60000);
  if (m < 1) return "under a minute";
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

const timeFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Toronto",
  hour: "numeric",
  minute: "2-digit",
});

export default async function VisitorsPage() {
  const { supabase } = await requireStaff(["admin", "editor", "sales"]);
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  // Geo columns arrive with the 20261124000001 migration; until it runs,
  // fall back to the base columns so the page keeps working.
  let geoMissing = false;
  const first = await supabase
    .from("visitor_events")
    .select("session_id,path,referrer,utm_source,utm_campaign,device,city,region,country,created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(8000);
  let data = first.data as unknown as Record<string, unknown>[] | null;
  let error = first.error;
  if (error && /city|region|country/.test(error.message ?? "")) {
    geoMissing = true;
    const second = await supabase
      .from("visitor_events")
      .select("session_id,path,referrer,utm_source,utm_campaign,device,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(8000);
    data = second.data as unknown as Record<string, unknown>[] | null;
    error = second.error;
  }
  const events = (data ?? []).map((e) => ({
    ...e,
    city: (e.city as string | null) ?? null,
    region: (e.region as string | null) ?? null,
    country: (e.country as string | null) ?? null,
  })) as Event[];
  const now = Date.now();

  const bySession = new Map<string, Session>();
  for (const e of events) {
    const t = new Date(e.created_at).getTime();
    const loc = [e.city, e.region, e.country].filter(Boolean).join(", ");
    const s = bySession.get(e.session_id);
    if (s) {
      s.last = t;
      s.pages.push(e.path);
      if (!s.location && loc) s.location = loc;
    } else {
      bySession.set(e.session_id, {
        id: e.session_id,
        first: t,
        last: t,
        pages: [e.path],
        device: e.device,
        source: sourceOf(e),
        location: loc,
      });
    }
  }
  const sessions = [...bySession.values()].sort((a, b) => b.last - a.last);
  const live = sessions.filter((s) => now - s.last < LIVE_MS);
  const recent = sessions.filter((s) => now - s.last >= LIVE_MS).slice(0, 20);

  const pageCounts = new Map<string, number>();
  for (const e of events) pageCounts.set(e.path, (pageCounts.get(e.path) ?? 0) + 1);
  const topPages = [...pageCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  const locCounts = new Map<string, number>();
  for (const s of sessions) if (s.location) locCounts.set(s.location, (locCounts.get(s.location) ?? 0) + 1);
  const topLocations = [...locCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const card = "rounded-[var(--radius-lg)] border border-line bg-white p-5";
  const th = "py-2 pr-4 text-left text-[12px] font-semibold uppercase tracking-wide text-muted";
  const td = "py-2 pr-4 text-[14px] align-top";

  const sessionRow = (s: Session) => (
    <tr key={s.id} className="border-t border-line">
      <td className={td}>
        <span className="font-medium">{s.pages[s.pages.length - 1]}</span>
        <span className="block text-[12.5px] text-muted">
          {s.pages.length} page{s.pages.length === 1 ? "" : "s"} · started {timeFmt.format(new Date(s.first))}
        </span>
      </td>
      <td className={td}>{s.source}</td>
      <td className={td}>{s.location || "—"}</td>
      <td className={td}>{s.device ?? "—"}</td>
      <td className={td}>{duration(s.last - s.first)}</td>
      <td className={td}>{ago(now - s.last)}</td>
    </tr>
  );

  return (
    <div className="mx-auto w-full max-w-6xl p-5 md:p-8">
      <VisitorsAutoRefresh />
      <h1 className="font-display text-[26px] font-bold tracking-tight">Visitors</h1>
      <p className="mt-1 text-[14px] text-muted">
        Who is on getsetsold.ca right now and in the last 24 hours. Refreshes every 30 seconds.
        {geoMissing ? " Locations appear once the 20261124000001_visitor_geo migration has run." : ""}
      </p>

      {error ? (
        <div className={`${card} mt-6`}>
          <p className="text-[15px] font-semibold">Tracking isn't running yet</p>
          <p className="mt-1 text-[14px] text-muted">
            The visitor_events table doesn't exist yet — run the 20261123000002_visitor_events migration in the
            CMS Supabase project and page views will start appearing here within a minute of the next visit.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className={card}>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Live now</p>
              <p className="mt-1 text-[34px] font-extrabold leading-none">{live.length}</p>
              <p className="mt-1 text-[13px] text-muted">active in the last 5 minutes</p>
            </div>
            <div className={card}>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Sessions · 24h</p>
              <p className="mt-1 text-[34px] font-extrabold leading-none">{sessions.length}</p>
              <p className="mt-1 text-[13px] text-muted">separate visits</p>
            </div>
            <div className={card}>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Page views · 24h</p>
              <p className="mt-1 text-[34px] font-extrabold leading-none">{events.length}</p>
              <p className="mt-1 text-[13px] text-muted">pages opened</p>
            </div>
          </div>

          <div className={`${card} mt-6 overflow-x-auto`}>
            <p className="text-[15px] font-semibold">On the site now</p>
            {live.length ? (
              <table className="mt-2 w-full border-collapse">
                <thead>
                  <tr>
                    <th className={th}>Viewing</th>
                    <th className={th}>Source</th>
                    <th className={th}>Location</th>
                    <th className={th}>Device</th>
                    <th className={th}>Time on site</th>
                    <th className={th}>Last active</th>
                  </tr>
                </thead>
                <tbody>{live.map(sessionRow)}</tbody>
              </table>
            ) : (
              <p className="mt-2 text-[14px] text-muted">No one is on the site right now.</p>
            )}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className={`${card} overflow-x-auto`}>
              <p className="text-[15px] font-semibold">Recent visits</p>
              {recent.length ? (
                <table className="mt-2 w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={th}>Last page</th>
                      <th className={th}>Source</th>
                      <th className={th}>Location</th>
                      <th className={th}>Device</th>
                      <th className={th}>Duration</th>
                      <th className={th}>Last active</th>
                    </tr>
                  </thead>
                  <tbody>{recent.map(sessionRow)}</tbody>
                </table>
              ) : (
                <p className="mt-2 text-[14px] text-muted">No earlier visits in the last 24 hours.</p>
              )}
            </div>
            <div className={card}>
              <p className="text-[15px] font-semibold">Top pages · 24h</p>
              {topPages.length ? (
                <ul className="mt-2 divide-y divide-line">
                  {topPages.map(([path, count]) => (
                    <li key={path} className="flex items-baseline justify-between py-2 text-[14px]">
                      <span className="font-medium">{path}</span>
                      <span className="text-muted">{count} view{count === 1 ? "" : "s"}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[14px] text-muted">No page views yet.</p>
              )}
              <p className="mt-6 text-[15px] font-semibold">Top locations · 24h</p>
              {topLocations.length ? (
                <ul className="mt-2 divide-y divide-line">
                  {topLocations.map(([loc, count]) => (
                    <li key={loc} className="flex items-baseline justify-between py-2 text-[14px]">
                      <span className="font-medium">{loc}</span>
                      <span className="text-muted">{count} visit{count === 1 ? "" : "s"}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[14px] text-muted">No locations recorded yet — they are stamped on new visits.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
