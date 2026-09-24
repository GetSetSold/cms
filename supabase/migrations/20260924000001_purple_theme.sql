-- Switch the default brand theme to the purple/indigo real-estate palette
-- (matches the approved reference: purple accent, deep-indigo dark sections,
-- light-lavender page background). Editable anytime in Settings > Branding.
update public.site_settings
set theme = '{"primary":"#6C5DD3","accent":"#1B1145","ink":"#14142B","ground":"#F4F2FC"}'
where id = 1;
