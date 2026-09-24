update public.site_settings
set header = header || '{
  "name_weight": "bold",
  "subline": "",
  "subline_size_mobile": 12,
  "subline_size_desktop": 13,
  "subline_weight": "normal"
}'::jsonb
where id = 1 and not (header ? 'name_weight');
