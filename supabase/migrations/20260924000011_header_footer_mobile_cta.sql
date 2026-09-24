-- Header background/text overrides + logo/name visibility per breakpoint,
-- a configurable mobile CTA bar (up to 3 buttons with icon + shape), and a
-- footer "columns per row" wrap setting.

alter table public.site_settings add column if not exists header jsonb not null default '{}';
alter table public.site_settings add column if not exists mobile_cta jsonb not null default '{}';

update public.site_settings
set header = coalesce(header, '{}'::jsonb) || '{
  "show_logo_mobile": true, "show_logo_desktop": true,
  "show_name_mobile": true, "show_name_desktop": true
}'::jsonb
where id = 1 and not (header ? 'show_logo_mobile');

update public.site_settings
set mobile_cta = '{
  "shape": "rectangle",
  "buttons": [
    {"type":"call","label":"Call","icon":"phone"},
    {"type":"sms","label":"Message","icon":"message"},
    {"type":"link","label":"Free Valuation","icon":"star","href":"/contact"}
  ]
}'::jsonb
where id = 1 and not (mobile_cta ? 'buttons');

update public.site_settings
set footer = footer || jsonb_build_object('columns_per_row', 4)
where id = 1 and not (footer ? 'columns_per_row');
