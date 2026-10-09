-- Agent CMA / valuation reports: active comps (auto from MLS grid) + sold comps (pasted),
-- pricing recommendation, linked to a lead, with revocable share links (same concept as form_shares).

CREATE TABLE IF NOT EXISTS public.valuation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  -- Property
  address TEXT NOT NULL,
  city TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  property_type TEXT,
  beds NUMERIC,
  baths NUMERIC,
  sqft TEXT,
  lot_size TEXT,
  year_built TEXT,
  upgrades TEXT,
  -- Comparables (JSONB arrays)
  active_comps JSONB NOT NULL DEFAULT '[]'::jsonb,
  sold_comps JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Pricing
  price_low INTEGER,
  price_high INTEGER,
  recommended_price INTEGER,
  pricing_notes TEXT,
  -- Sharing (same concept as form_shares)
  share_token TEXT UNIQUE,
  share_expires_at TIMESTAMPTZ,
  share_revoked BOOLEAN NOT NULL DEFAULT FALSE,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_valuation_reports_lead ON public.valuation_reports(lead_id);
CREATE INDEX IF NOT EXISTS idx_valuation_reports_token ON public.valuation_reports(share_token);

ALTER TABLE public.valuation_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff manage valuation_reports" ON public.valuation_reports;
CREATE POLICY "staff manage valuation_reports" ON public.valuation_reports FOR ALL
  USING (public.has_role(array['admin','editor','sales']::public.app_role[]))
  WITH CHECK (public.has_role(array['admin','editor','sales']::public.app_role[]));

-- Public can read unexpired, non-revoked shared reports via token.
DROP POLICY IF EXISTS "public read shared valuation_reports" ON public.valuation_reports;
CREATE POLICY "public read shared valuation_reports" ON public.valuation_reports FOR SELECT
  USING (
    share_token IS NOT NULL
    AND share_revoked = FALSE
    AND (share_expires_at IS NULL OR share_expires_at > now())
  );
