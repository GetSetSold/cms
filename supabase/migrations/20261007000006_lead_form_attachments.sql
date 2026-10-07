-- Attach forms to existing leads (staff fill-out or send-to-fill links).
-- Answers live here (not merged into custom_fields) so each attachment keeps
-- its form, timestamp, and who filled it.

CREATE TABLE IF NOT EXISTS public.lead_form_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES public.forms(id),
  form_key TEXT NOT NULL,
  form_name TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  filled_by TEXT NOT NULL DEFAULT 'staff' CHECK (filled_by IN ('staff', 'lead')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lead_form_attachments_lead ON public.lead_form_attachments(lead_id);

ALTER TABLE public.lead_form_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff manage attachments" ON public.lead_form_attachments;
CREATE POLICY "staff manage attachments" ON public.lead_form_attachments FOR ALL
  USING (public.has_role(array['admin','editor','sales']::public.app_role[]))
  WITH CHECK (public.has_role(array['admin','editor','sales']::public.app_role[]));

-- Send-to-fill tokens: a link that opens a form pre-tied to an existing lead.
-- When the lead submits via the token, answers attach instead of creating a new lead.
CREATE TABLE IF NOT EXISTS public.lead_form_tokens (
  token TEXT PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES public.forms(id),
  lead_name TEXT NOT NULL DEFAULT '',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lead_form_tokens_lead ON public.lead_form_tokens(lead_id);

ALTER TABLE public.lead_form_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff manage form tokens" ON public.lead_form_tokens;
CREATE POLICY "staff manage form tokens" ON public.lead_form_tokens FOR ALL
  USING (public.has_role(array['admin','editor','sales']::public.app_role[]))
  WITH CHECK (public.has_role(array['admin','editor','sales']::public.app_role[]));
-- Public can validate a token (to show the form); submission goes through the API.
DROP POLICY IF EXISTS "public read valid form tokens" ON public.lead_form_tokens;
CREATE POLICY "public read valid form tokens" ON public.lead_form_tokens FOR SELECT
  USING (expires_at > now() AND used_at IS NULL);

-- Token-authorized attachment: lets a lead submit via a send-to-fill link
-- without lead-table access. Validates the token, writes the attachment as
-- filled_by='lead', and marks the token used — all atomically.
CREATE OR REPLACE FUNCTION public.attach_lead_form(
  p_token TEXT, p_lead_id UUID, p_form_id UUID,
  p_form_key TEXT, p_form_name TEXT, p_answers JSONB
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.lead_form_tokens
    WHERE token = p_token AND lead_id = p_lead_id AND form_id = p_form_id
      AND expires_at > now() AND used_at IS NULL
  ) INTO v_valid;
  IF NOT v_valid THEN
    RAISE EXCEPTION 'Invalid or expired link.';
  END IF;

  INSERT INTO public.lead_form_attachments (lead_id, form_id, form_key, form_name, answers, filled_by)
  VALUES (p_lead_id, p_form_id, p_form_key, p_form_name, p_answers, 'lead');

  UPDATE public.lead_form_tokens SET used_at = now() WHERE token = p_token;
END;
$$;
