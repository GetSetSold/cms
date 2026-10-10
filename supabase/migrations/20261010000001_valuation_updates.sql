-- Monthly valuation update emails: send log, lead opt-out, and pg_cron schedule.
-- Uses the existing vault secrets (project_url, cron_secret) from 20260923000003_cron.sql.

-- One row per report per month: prevents duplicate sends.
CREATE TABLE IF NOT EXISTS valuation_update_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES valuation_reports(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  month TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  old_value NUMERIC,
  new_value NUMERIC,
  pct_change NUMERIC,
  market_slug TEXT,
  market_name TEXT,
  unsubscribe_token TEXT UNIQUE,
  UNIQUE (report_id, month)
);

ALTER TABLE valuation_update_sends ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff read update sends" ON valuation_update_sends;
CREATE POLICY "Staff read update sends"
  ON valuation_update_sends FOR SELECT
  TO authenticated
  USING (true);

-- Per-lead opt-out for the monthly market updates (CASL compliance).
ALTER TABLE leads ADD COLUMN IF NOT EXISTS valuation_updates_opt_out BOOLEAN NOT NULL DEFAULT FALSE;

-- Public unsubscribe: called by the Next.js route with the token from the email.
-- SECURITY DEFINER so anon callers can flip only this one flag, only via a valid token.
CREATE OR REPLACE FUNCTION public.unsubscribe_valuation_updates(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE leads
  SET valuation_updates_opt_out = TRUE
  WHERE id IN (SELECT lead_id FROM valuation_update_sends WHERE unsubscribe_token = p_token)
    AND valuation_updates_opt_out = FALSE;
  RETURN FOUND;
END;
$$;

-- Monthly run: 9:00 UTC on the 1st of each month (5am EDT / 4am EST).
SELECT cron.schedule(
  'valuation-monthly-update',
  '0 9 1 * *',
  $$
  SELECT net.http_post(
    url     := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/valuation-monthly-update',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')),
    body    := '{}'::jsonb
  );
  $$
);
