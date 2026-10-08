-- Shares now cover any attached form (not just rental applications).
-- Rename to form_shares; shares can point to a lead's main submission OR a specific attachment.

ALTER TABLE IF EXISTS public.rental_application_shares RENAME TO form_shares;

ALTER TABLE public.form_shares
  ADD COLUMN IF NOT EXISTS attachment_id UUID REFERENCES public.lead_form_attachments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_form_shares_attachment ON public.form_shares(attachment_id);

-- Lead types: a lead can be multiple types over time (tenant, buyer, seller, landlord, investor).
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS types TEXT[] NOT NULL DEFAULT '{}';

-- Opportunities: deal-level tracking above the lead (e.g. "Tenant — 100 Lillian Way").
CREATE TABLE IF NOT EXISTS public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('tenant', 'buyer', 'seller', 'landlord', 'investor')),
  stage TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_opportunities_lead ON public.opportunities(lead_id);

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff manage opportunities" ON public.opportunities;
CREATE POLICY "staff manage opportunities" ON public.opportunities FOR ALL
  USING (public.has_role(array['admin','editor','sales']::public.app_role[]))
  WITH CHECK (public.has_role(array['admin','editor','sales']::public.app_role[]));
