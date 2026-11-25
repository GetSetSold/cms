-- Live visitor presence for Admin → Visitors ("who is on the site NOW").
-- One row per active session, kept current by /api/track heartbeats:
-- written on each page view, refreshed by a 20s ping, deleted when the
-- visitor leaves. Written by the anonymous role (through /api/track
-- only — it stamps location server-side); read by staff only.
-- Run in the CMS/CRM project (pcgggfqndoaoddcrechr).
CREATE TABLE IF NOT EXISTS public.visitor_presence (
  session_id text PRIMARY KEY,
  path text NOT NULL,
  referrer text,
  utm_source text,
  utm_campaign text,
  device text,
  city text,
  region text,
  country text,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS visitor_presence_last_seen_idx ON public.visitor_presence (last_seen DESC);

ALTER TABLE public.visitor_presence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "visitor presence anon insert" ON public.visitor_presence;
CREATE POLICY "visitor presence anon insert" ON public.visitor_presence
  FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "visitor presence anon update" ON public.visitor_presence;
CREATE POLICY "visitor presence anon update" ON public.visitor_presence
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "visitor presence anon delete" ON public.visitor_presence;
CREATE POLICY "visitor presence anon delete" ON public.visitor_presence
  FOR DELETE TO anon USING (true);
DROP POLICY IF EXISTS "visitor presence staff read" ON public.visitor_presence;
CREATE POLICY "visitor presence staff read" ON public.visitor_presence
  FOR SELECT TO authenticated USING (true);

-- Explicit grants (required for tables created after 2026-10-30).
GRANT INSERT, UPDATE, DELETE ON public.visitor_presence TO anon;
GRANT SELECT ON public.visitor_presence TO authenticated;
