-- Valuation reports v2: structured upgrade adjustments + listing presentation config.

ALTER TABLE public.valuation_reports
  ADD COLUMN IF NOT EXISTS upgrade_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS presentation JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.valuation_reports.upgrade_items IS
  'Structured upgrades: [{description, amount}] — amounts adjust the pricing suggestion.';
COMMENT ON COLUMN public.valuation_reports.presentation IS
  'Listing presentation config: {include: [section keys], agent: {name, phone, email, brokerage, tagline, bio}}.';
