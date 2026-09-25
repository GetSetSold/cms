update public.site_settings
set header = header || '{"logo_gap": 10}'::jsonb
where id = 1 and not (header ? 'logo_gap');
