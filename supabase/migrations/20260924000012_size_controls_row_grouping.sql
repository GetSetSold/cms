-- Sizing controls for header logo/site-name and the mobile CTA bar's button
-- size — all keys added inside the existing `header` / `mobile_cta` jsonb
-- columns, so no new columns needed here.

update public.site_settings
set header = header || '{"logo_size": 32, "name_size_mobile": 24, "name_size_desktop": 30}'::jsonb
where id = 1 and not (header ? 'logo_size');

update public.site_settings
set mobile_cta = mobile_cta || '{"size": "md"}'::jsonb
where id = 1 and not (mobile_cta ? 'size');
