-- Site fonts are now runtime-configurable (Settings > Branding), loaded via
-- Google Fonts at request time rather than baked in at build time. Set the
-- current default row's theme to include the font key explicitly.
update public.site_settings
set theme = theme || '{"font":"Inter"}'::jsonb
where id = 1 and not (theme ? 'font');
