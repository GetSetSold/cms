import { requireStaff } from "@/lib/auth";
import { VisitorsAutoRefresh } from "@/components/admin/VisitorsAutoRefresh";
import { botKind } from "@/lib/botDetect";

/**
 * Admin → Visitors — the SalesIQ LiveView replacement.
 * "Live now" reads public.visitor_presence (heartbeat-kept: a ping in
 * the last 45 seconds), falling back to recent visitor_events until the
 * presence migration runs. History is the last 24 hours of
 * visitor_events. Auto-refreshes every 10s.
 */

type Event = {
  session_id: string;
  path: string;
  referrer: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  device: string | null;
  user_agent: string | null;
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
  agent: string;
  source: SourceInfo;
  location: string;
  country: string | null;
};

/** Friendly browser / bot label from a raw user-agent string. Crawlers
 *  name themselves; headless browsers are scrapers in practice. */
function agentLabel(ua: string | null | undefined): string {
  if (!ua) return "—";
  const bot = botKind(ua);
  if (bot) return bot;
  if (/Edg\//.test(ua)) return "Edge";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua)) return "Safari";
  return "Other";
}

function deviceAgent(device: string | null, agent: string): string {
  const parts = [device, agent !== "—" ? agent : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

/** Flag emoji for an ISO country code (CA → 🇨🇦), from the regional
 *  indicator symbols — no images needed. */
function flagFor(country: string | null | undefined): string {
  if (!country || country.trim().length !== 2) return "";
  const cc = country.trim().toUpperCase();
  return String.fromCodePoint(...[...cc].map((c) => 127397 + c.charCodeAt(0)));
}

function locText(location: string, country: string | null | undefined): string {
  if (!location) return "—";
  const f = flagFor(country);
  return f ? `${f} ${location}` : location;
}

type Presence = {
  session_id: string;
  path: string;
  referrer: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  device: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  first_seen: string;
  last_seen: string;
};

const LIVE_MS = 5 * 60_000;
const PRESENT_MS = 45_000;

/** Friendly traffic source: search engines and socials get their
 *  brand name (+ favicon domain), other referrers show their hostname,
 *  and no referrer at all is Direct. */
const KNOWN_SOURCES: { match: RegExp; label: string; domain: string }[] = [
  { match: /(^|\.)google\./, label: "Google", domain: "google.com" },
  { match: /bing\.com$/, label: "Bing", domain: "bing.com" },
  { match: /duckduckgo\.com$/, label: "DuckDuckGo", domain: "duckduckgo.com" },
  { match: /(^|\.)yahoo\./, label: "Yahoo", domain: "yahoo.com" },
  { match: /facebook\.com$|fb\.com$/, label: "Facebook", domain: "facebook.com" },
  { match: /instagram\.com$/, label: "Instagram", domain: "instagram.com" },
  { match: /linkedin\.com$/, label: "LinkedIn", domain: "linkedin.com" },
  { match: /(^|\.)x\.com$|twitter\.com$|(^|\.)t\.co$/, label: "X", domain: "x.com" },
  { match: /youtube\.com$|youtu\.be$/, label: "YouTube", domain: "youtube.com" },
  { match: /tiktok\.com$/, label: "TikTok", domain: "tiktok.com" },
  { match: /realtor\.ca$/, label: "Realtor.ca", domain: "realtor.ca" },
];
const UTM_SOURCES: Record<string, { label: string; domain: string | null }> = {
  google: { label: "Google", domain: "google.com" },
  bing: { label: "Bing", domain: "bing.com" },
  facebook: { label: "Facebook", domain: "facebook.com" },
  fb: { label: "Facebook", domain: "facebook.com" },
  instagram: { label: "Instagram", domain: "instagram.com" },
  linkedin: { label: "LinkedIn", domain: "linkedin.com" },
  twitter: { label: "X", domain: "x.com" },
  x: { label: "X", domain: "x.com" },
  youtube: { label: "YouTube", domain: "youtube.com" },
  tiktok: { label: "TikTok", domain: "tiktok.com" },
  newsletter: { label: "Email", domain: null },
  email: { label: "Email", domain: null },
};

type SourceInfo = { label: string; domain: string | null };

function sourceInfo(e: Pick<Event, "utm_source" | "utm_campaign" | "referrer">): SourceInfo {
  if (e.utm_source) {
    const known = UTM_SOURCES[e.utm_source.toLowerCase()];
    const base = known ?? { label: e.utm_source, domain: null };
    return { label: e.utm_campaign ? `${base.label} / ${e.utm_campaign}` : base.label, domain: base.domain };
  }
  if (e.referrer) {
    try {
      const host = new URL(e.referrer).hostname.replace(/^www\./, "");
      const known = KNOWN_SOURCES.find((k) => k.match.test(host));
      return known ? { label: known.label, domain: known.domain } : { label: host, domain: host };
    } catch {
      return { label: "Referral", domain: null };
    }
  }
  return { label: "Direct", domain: null };
}

function SourceCell({ source }: { source: SourceInfo }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {source.domain ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://www.google.com/s2/favicons?domain=${source.domain}&sz=32`}
          alt=""
          width={16}
          height={16}
          className="rounded-[4px]"
          loading="lazy"
        />
      ) : null}
      {source.label}
    </span>
  );
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

export default async function VisitorsPage({ searchParams }: { searchParams: Promise<{ bots?: string }> }) {
  const { supabase } = await requireStaff(["admin", "editor", "sales"]);
  const showBots = (await searchParams)?.bots === "1";
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  // Geo columns arrive with the 20261124000001 migration; until it runs,
  // fall back to the base columns so the page keeps working.
  // PostgREST returns at most 1,000 rows per request, so page through
  // newest-first chunks (up to 5,000 events). The original single
  // ascending fetch silently pinned every stat to the day's FIRST
  // 1,000 views — the page looked frozen once traffic passed that.
  const fetchEvents = async (cols: string) => {
    const rows: Record<string, unknown>[] = [];
    for (let offset = 0; offset < 5000; offset += 1000) {
      const r = await supabase
        .from("visitor_events")
        .select(cols)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .range(offset, offset + 999);
      if (r.error) return { rows: null as Record<string, unknown>[] | null, error: r.error };
      const chunk = (r.data ?? []) as unknown as Record<string, unknown>[];
      rows.push(...chunk);
      if (chunk.length < 1000) break;
    }
    return { rows: rows as Record<string, unknown>[] | null, error: null as null };
  };
  let geoMissing = false;
  let { rows: data, error } = await fetchEvents("session_id,path,referrer,utm_source,utm_campaign,device,user_agent,city,region,country,created_at");
  if (error && /city|region|country/.test(error.message ?? "")) {
    geoMissing = true;
    ({ rows: data, error } = await fetchEvents("session_id,path,referrer,utm_source,utm_campaign,device,user_agent,created_at"));
  }
  const events = (data ?? []).slice().reverse().map((e) => ({
    ...e,
    city: (e.city as string | null) ?? null,
    region: (e.region as string | null) ?? null,
    country: (e.country as string | null) ?? null,
  })) as Event[];
  const now = Date.now();

  // People-only by default: self-identified bot sessions are filtered
  // out of every stat and table (they're still in the data, and the
  // ?bots=1 toggle shows them). New bot traffic isn't recorded at all
  // anymore — /api/track drops it — this filter covers the history.
  const uaBySession = new Map<string, string | null>();
  for (const e of events) if (!uaBySession.has(e.session_id)) uaBySession.set(e.session_id, e.user_agent);
  const botSessionCount = [...uaBySession.values()].filter((ua) => botKind(ua)).length;
  const visibleEvents = showBots ? events : events.filter((e) => !botKind(e.user_agent));

  const bySession = new Map<string, Session>();
  for (const e of visibleEvents) {
    const t = new Date(e.created_at).getTime();
    const loc = [e.city, e.region, e.country].filter(Boolean).join(", ");
    const s = bySession.get(e.session_id);
    if (s) {
      s.last = t;
      s.pages.push(e.path);
      if (!s.location && loc) s.location = loc;
      if (!s.country && e.country) s.country = e.country;
    } else {
      bySession.set(e.session_id, {
        id: e.session_id,
        first: t,
        last: t,
        pages: [e.path],
        device: e.device,
        agent: agentLabel(e.user_agent),
        source: sourceInfo(e),
        location: loc,
        country: e.country,
      });
    }
  }
  const sessions = [...bySession.values()].sort((a, b) => b.last - a.last);
  const live = sessions.filter((s) => now - s.last < LIVE_MS);
  const recent = sessions.filter((s) => now - s.last >= LIVE_MS).slice(0, 20);

  // Truly-live presence (heartbeat rows). Until the 20261124000002
  // migration runs, this query errors and the page falls back to the
  // recent-events approximation above.
  const presenceRes = await supabase
    .from("visitor_presence")
    .select("session_id,path,referrer,utm_source,utm_campaign,device,city,region,country,first_seen,last_seen")
    .order("last_seen", { ascending: false })
    .limit(200);
  const presenceMissing = !!presenceRes.error;
  const present = ((presenceRes.data ?? []) as Presence[]).filter(
    (p) => now - new Date(p.last_seen).getTime() < PRESENT_MS && (showBots || !botKind(uaBySession.get(p.session_id))),
  );

  const pageCounts = new Map<string, number>();
  for (const e of visibleEvents) pageCounts.set(e.path, (pageCounts.get(e.path) ?? 0) + 1);
  const topPages = [...pageCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  const locCounts = new Map<string, { n: number; country: string | null }>();
  for (const s of sessions) {
    if (!s.location) continue;
    const cur = locCounts.get(s.location);
    if (cur) cur.n++;
    else locCounts.set(s.location, { n: 1, country: s.country });
  }
  const topLocations = [...locCounts.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 8);
  const agentBySession = new Map(sessions.map((s) => [s.id, s.agent]));

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
      <td className={td}><SourceCell source={s.source} /></td>
      <td className={td}>{locText(s.location, s.country)}</td>
      <td className={td}>{deviceAgent(s.device, s.agent)}</td>
      <td className={td}>{duration(s.last - s.first)}</td>
      <td className={td}>{ago(now - s.last)}</td>
    </tr>
  );

  const presenceRow = (p: Presence) => {
    const first = new Date(p.first_seen).getTime();
    const last = new Date(p.last_seen).getTime();
    const loc = [p.city, p.region, p.country].filter(Boolean).join(", ");
    return (
      <tr key={p.session_id} className="border-t border-line">
        <td className={td}>
          <span className="font-medium">{p.path}</span>
          <span className="block text-[12.5px] text-muted">arrived {timeFmt.format(new Date(first))}</span>
        </td>
        <td className={td}><SourceCell source={sourceInfo(p)} /></td>
        <td className={td}>{locText(loc, p.country)}</td>
        <td className={td}>{deviceAgent(p.device, agentBySession.get(p.session_id) ?? "—")}</td>
        <td className={td}>{duration(now - first)}</td>
        <td className={td}>{ago(now - last)}</td>
      </tr>
    );
  };

  return (
    <div className="mx-auto w-full max-w-6xl p-5 md:p-8">
      <VisitorsAutoRefresh />
      <h1 className="font-display text-[26px] font-bold tracking-tight">Visitors</h1>
      <p className="mt-1 text-[14px] text-muted">
        Who is on getsetsold.ca right now and in the last 24 hours. Refreshes every 10 seconds.{" "}
        {showBots ? (
          <a className="underline" href="/admin/visitors">Hide bots</a>
        ) : (
          <>
            <a className="underline" href="/admin/visitors?bots=1">Show bots too</a>
            {botSessionCount > 0 ? ` — ${botSessionCount} bot visit${botSessionCount === 1 ? "" : "s"} hidden in the last 24h.` : ""}
          </>
        )}
        {geoMissing ? " Locations appear once the 20261124000001_visitor_geo migration has run." : ""}
        {presenceMissing ? " The live view sharpens once the 20261124000002_visitor_presence migration has run." : ""}
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
              <p className="mt-1 text-[34px] font-extrabold leading-none">{presenceMissing ? live.length : present.length}</p>
              <p className="mt-1 text-[13px] text-muted">{presenceMissing ? "active in the last 5 minutes" : "on the site right now"}</p>
            </div>
            <div className={card}>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Sessions · 24h</p>
              <p className="mt-1 text-[34px] font-extrabold leading-none">{sessions.length}</p>
              <p className="mt-1 text-[13px] text-muted">separate visits</p>
            </div>
            <div className={card}>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Page views · 24h</p>
              <p className="mt-1 text-[34px] font-extrabold leading-none">{visibleEvents.length}</p>
              <p className="mt-1 text-[13px] text-muted">pages opened</p>
            </div>
          </div>

          <div className={`${card} mt-6 overflow-x-auto`}>
            <p className="text-[15px] font-semibold">On the site now</p>
            {!presenceMissing ? (
              present.length ? (
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
                  <tbody>{present.map(presenceRow)}</tbody>
                </table>
              ) : (
                <p className="mt-2 text-[14px] text-muted">No one is on the site right now.</p>
              )
            ) : live.length ? (
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
                  {topLocations.map(([loc, info]) => (
                    <li key={loc} className="flex items-baseline justify-between py-2 text-[14px]">
                      <span className="font-medium">{locText(loc, info.country)}</span>
                      <span className="text-muted">{info.n} visit{info.n === 1 ? "" : "s"}</span>
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
