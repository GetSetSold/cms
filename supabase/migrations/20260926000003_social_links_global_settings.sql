update public.site_settings
set social_links = '{"size":"md","items":[]}'::jsonb
where id = 1 and (social_links = '{}'::jsonb or social_links is null);
