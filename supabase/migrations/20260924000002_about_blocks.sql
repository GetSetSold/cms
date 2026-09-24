-- New block types for the About page (and reusable elsewhere): timeline,
-- team_profile, service_areas. The other spec sections (brand story, what-
-- to-expect, verified-proof stats) already map onto existing blocks
-- (text_svg, features, stats) so no new type is needed for those.

insert into public.block_types (key, name, category, default_data) values
('timeline',      'Timeline',        'content', '{"heading":"Where we''ve been","items":[{"year":"[Year]","title":"[Brand] founded"},{"year":"[Year]","title":"[Milestone]"},{"year":"Today","title":"[Current milestone]"}]}'),
('team_profile',  'Team profile',    'content', '{"eyebrow":"Your agent","name":"[Agent name]","role":"[Title] · [Brokerage name]","bio":"[Two to three sentences on background, specialties, and approach.]","svg_id":"00000000-0000-4000-8000-000000000005","primary_cta":{"label":"Contact","href":"/contact"},"secondary_cta":{"label":"View listings","href":"/listings"}}'),
('service_areas', 'Service areas',   'content', '{"heading":"Areas we serve","items":[]}');

-- Rebuild the About template to match the approved section order:
-- dark hero -> brand story -> what to expect -> timeline -> stat band
-- (dark) -> team profile -> service areas -> cta.
update public.templates set blocks = '[
  {"type":"hero","data":{"eyebrow":"About [Brand]","heading":"Real estate, handled the way it should be.","subheading":"We''ve helped hundreds of buyers, sellers, and tenants across [service area] move with less stress and more savings.","layout":"centered","tone":"dark","svg_id":null,"primary_cta":{"label":"Get in touch","href":"/contact"}},"settings":{"background":"dark"}},
  {"type":"text_svg","data":{"heading":"Founded on a simple idea: clients deserve a better deal.","body":"[Two or three short paragraphs about how the business started, what problem it set out to solve, and what you still care about most today.]"}},
  {"type":"features","data":{"heading":"What you can expect working with us"}},
  {"type":"timeline"},
  {"type":"stats","settings":{"background":"dark"}},
  {"type":"team_profile"},
  {"type":"service_areas"},
  {"type":"cta"}
]' where slug = 'about';

-- Update the already-published About page to match, so it doesn't require
-- a manual rebuild in the admin. Leaves other pages (home, services, etc.)
-- untouched — the About template only affects pages created from it going
-- forward, this block regenerates the one page that already existed.
do $$
declare
  v_page uuid;
  v_template uuid;
begin
  select id into v_page from public.pages where slug = 'about';
  select id into v_template from public.templates where slug = 'about';
  if v_page is not null and v_template is not null then
    delete from public.page_sections where page_id = v_page;
    insert into public.page_sections (page_id, block_type, position, data, settings)
    select v_page,
           b.value->>'type',
           (b.ordinality - 1)::int,
           coalesce(bt.default_data, '{}') || coalesce(b.value->'data', '{}'),
           coalesce(b.value->'settings', '{}')
    from public.templates t
    cross join lateral jsonb_array_elements(t.blocks) with ordinality b
    join public.block_types bt on bt.key = b.value->>'type'
    where t.id = v_template;
  end if;
end $$;
