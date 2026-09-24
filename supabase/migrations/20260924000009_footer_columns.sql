-- The footer was previously hardcoded in the component (Pages/Contact/Company).
-- Replace it with real, editable columns so any number of footer columns and
-- links can be configured from Settings > Navigation & footer.
update public.site_settings
set footer = jsonb_build_object(
  'tagline', coalesce(footer->>'tagline', ''),
  'columns', jsonb_build_array(
    jsonb_build_object('heading', 'Company', 'links', jsonb_build_array(
      jsonb_build_object('label', 'About', 'href', '/about'),
      jsonb_build_object('label', 'Services', 'href', '/services'),
      jsonb_build_object('label', 'Contact', 'href', '/contact')
    )),
    jsonb_build_object('heading', 'Properties', 'links', jsonb_build_array(
      jsonb_build_object('label', 'Buy', 'href', '/listings?type=sale'),
      jsonb_build_object('label', 'Rent', 'href', '/listings?type=rent')
    ))
  )
)
where id = 1 and not (footer ? 'columns' and jsonb_typeof(footer->'columns') = 'array' and jsonb_array_length(footer->'columns') > 0);
