-- Selling-intent question for the monthly valuation update emails.
-- Run in pcgggfqndoaoddcrechr (Supabase dashboard → SQL editor).
--
-- Each monthly send gets its own intent token; the five answer links in the
-- email carry it. The /api/valuation-updates/intent route (service role)
-- records the answer here and routes follow-ups:
--   3mo      → hot-lead alert email to Rohit + reminder due now
--   6mo      → reminder in ~45 days
--   12mo     → reminder in ~90 days
--   tracking → recorded only
--   none     → recorded only
-- intent_alert_sent / intent_actioned_at guard against duplicate
-- alerts/reminders when a link is clicked more than once.
--
-- No new table, so no new PostgREST grants are needed; the existing
-- staff SELECT policy on valuation_update_sends covers reads.

alter table public.valuation_update_sends
  add column if not exists intent_token text unique,
  add column if not exists intent_choice text,
  add column if not exists intent_at timestamptz,
  add column if not exists intent_alert_sent boolean not null default false,
  add column if not exists intent_actioned_at timestamptz;
