-- Shareable rental application links.
-- A share wraps a lead (form_key rental_application) with a random token and expiry.
-- Public view at /shared/application/[token]; branded via site_settings.doc_branding.

CREATE TABLE IF NOT EXISTS public.rental_application_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  view_count INT NOT NULL DEFAULT 0,
  -- Branding snapshot at share time, so the document keeps its header/footer
  -- even if the brokerage branding changes later.
  branding JSONB NOT NULL DEFAULT '{}',
  -- Application data snapshot at share time (resolved labels + values), so the
  -- public page never touches the leads table and the document is frozen as shared.
  snapshot JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rental_shares_token ON public.rental_application_shares(token);
CREATE INDEX IF NOT EXISTS idx_rental_shares_lead ON public.rental_application_shares(lead_id);

ALTER TABLE public.rental_application_shares ENABLE ROW LEVEL SECURITY;

-- Public read for valid (unexpired) tokens; staff manage.
DROP POLICY IF EXISTS "public read valid shares" ON public.rental_application_shares;
CREATE POLICY "public read valid shares" ON public.rental_application_shares FOR SELECT
  USING (expires_at > now());
DROP POLICY IF EXISTS "staff manage shares" ON public.rental_application_shares;
CREATE POLICY "staff manage shares" ON public.rental_application_shares FOR ALL
  USING (public.has_role(array['admin','editor','sales']::public.app_role[]))
  WITH CHECK (public.has_role(array['admin','editor','sales']::public.app_role[]));

-- Document branding (header/footer for shared applications). Pickable so it can
-- change with brokerage.
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS doc_branding JSONB NOT NULL DEFAULT '{}';
