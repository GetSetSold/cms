-- Junction table: promos can link to multiple projects
CREATE TABLE IF NOT EXISTS public.promo_projects (
  promo_id uuid NOT NULL REFERENCES public.promos(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promo_projects_pkey PRIMARY KEY (promo_id, project_id)
);

-- Migrate existing single project_id links into the junction
INSERT INTO public.promo_projects (promo_id, project_id)
SELECT id, project_id FROM public.promos
WHERE project_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE public.promo_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.promo_projects FOR SELECT USING (true);
CREATE POLICY "authenticated write: promo_projects" ON public.promo_projects FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
