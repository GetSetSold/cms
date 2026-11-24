-- Visitor tracking for Admin → Visitors (live view).
-- Run in the CMS/CRM project (pcgggfqndoaoddcrechr).
-- Anonymous visitors may INSERT page views only; staff (authenticated) read.
CREATE TABLE IF NOT EXISTS public.visitor_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id text NOT NULL,
  path text NOT NULL,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS visitor_events_created_idx ON public.visitor_events (created_at DESC);
CREATE INDEX IF NOT EXISTS visitor_events_session_idx ON public.visitor_events (session_id, created_at);

ALTER TABLE public.visitor_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "visitor events anon insert" ON public.visitor_events;
CREATE POLICY "visitor events anon insert" ON public.visitor_events
  FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "visitor events staff read" ON public.visitor_events;
CREATE POLICY "visitor events staff read" ON public.visitor_events
  FOR SELECT TO authenticated USING (true);

-- Explicit grants (required for tables created after 2026-10-30).
GRANT INSERT ON public.visitor_events TO anon;
GRANT SELECT ON public.visitor_events TO authenticated;
