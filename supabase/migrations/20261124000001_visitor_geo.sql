-- Visitor geolocation for Admin → Visitors (city / region / country from
-- Cloudflare, stamped server-side by /api/track — no IP is stored).
-- Run in the CMS/CRM project (pcgggfqndoaoddcrechr).
ALTER TABLE public.visitor_events
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS country text;
