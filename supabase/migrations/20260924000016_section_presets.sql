-- Section presets: a library of ready-made sections (like Designmodo's block
-- gallery) built from our existing block types, with row grouping/columns
-- already configured. Inserting a preset drops in several already-laid-out
-- blocks at once — no manual "group with block above/below" needed.

create table public.section_presets (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text not null,   -- Hero | Feature | CTA | Testimonial | Pricing | Team | Contact | Stats | FAQ | Steps | Listings | Trust
  description text,
  blocks      jsonb not null default '[]',  -- [{type, data, settings}]
  sort_order  int not null default 0
);

alter table public.section_presets enable row level security;
create policy "read presets" on public.section_presets for select
  using (public.has_role(array['admin','editor']::public.app_role[]));
create policy "admin manage presets" on public.section_presets for all
  using (public.has_role(array['admin']::public.app_role[]))
  with check (public.has_role(array['admin']::public.app_role[]));

insert into public.section_presets (name, category, description, sort_order, blocks) values

('Split hero with stats badge', 'Hero', 'Headline + illustration with a floating stat callout.', 1, '[
  {"type":"hero","data":{"eyebrow":"[Category]","heading":"A clear headline that states the value.","heading_accent":"in plain words.","subheading":"One or two sentences on what you do and who it''s for.","layout":"split","primary_cta":{"label":"Get started","href":"/contact"},"secondary_cta":{"label":"Learn more","href":"/services"},"badge":{"label":"Trusted by","value":"[#]+ clients"}}}
]'),

('Centered hero with icon', 'Hero', 'Centered headline with a small circular icon above the eyebrow.', 2, '[
  {"type":"hero","data":{"eyebrow":"[Category]","heading":"A clear headline that states the value.","layout":"centered","centered_icon_radius":64,"primary_cta":{"label":"Get started","href":"/contact"}}}
]'),

('3-column icon features', 'Feature', 'Three icon cards side by side — desktop only, stacks cleanly on mobile.', 1, '[
  {"type":"icon_card","data":{"heading":"[Benefit one]","text":"One or two sentences on why this matters to the visitor."},"settings":{"row_id":"feat3","row_columns":3}},
  {"type":"icon_card","data":{"heading":"[Benefit two]","text":"One or two sentences on why this matters to the visitor."},"settings":{"row_id":"feat3","row_columns":3}},
  {"type":"icon_card","data":{"heading":"[Benefit three]","text":"One or two sentences on why this matters to the visitor."},"settings":{"row_id":"feat3","row_columns":3}}
]'),

('4-column icon features', 'Feature', 'Four compact icon cards in a row.', 2, '[
  {"type":"icon_card","data":{"heading":"[Benefit one]","text":"Short supporting line."},"settings":{"row_id":"feat4","row_columns":4}},
  {"type":"icon_card","data":{"heading":"[Benefit two]","text":"Short supporting line."},"settings":{"row_id":"feat4","row_columns":4}},
  {"type":"icon_card","data":{"heading":"[Benefit three]","text":"Short supporting line."},"settings":{"row_id":"feat4","row_columns":4}},
  {"type":"icon_card","data":{"heading":"[Benefit four]","text":"Short supporting line."},"settings":{"row_id":"feat4","row_columns":4}}
]'),

('2-column benefit cards', 'Feature', 'Two larger icon cards side by side.', 3, '[
  {"type":"icon_card","data":{"heading":"[Benefit one]","text":"A slightly longer description works well at this width."},"settings":{"row_id":"feat2","row_columns":2}},
  {"type":"icon_card","data":{"heading":"[Benefit two]","text":"A slightly longer description works well at this width."},"settings":{"row_id":"feat2","row_columns":2}}
]'),

('Simple CTA band', 'CTA', 'A single call-to-action strip.', 1, '[
  {"type":"cta","data":{"heading":"Ready when you are.","text":"","button":{"label":"Get in touch","href":"/contact"}}}
]'),

('CTA with checklist', 'CTA', 'A short checklist next to a call to action, stacked full-width.', 2, '[
  {"type":"checklist","data":{"heading":"What''s included","items":[{"text":"[Item one]"},{"text":"[Item two]"},{"text":"[Item three]"}]}},
  {"type":"cta","data":{"heading":"Ready to get started?","button":{"label":"Book a call","href":"/contact"}}}
]'),

('3-tier pricing', 'Pricing', 'Three plans with the middle one highlighted.', 1, '[
  {"type":"pricing","data":{"heading":"Pricing","plans":[
    {"name":"[Starter]","price":"$[X]","period":"/mo","features":"[Feature]\n[Feature]","cta_label":"Choose plan","cta_href":"/contact","highlight":false},
    {"name":"[Growth]","price":"$[X]","period":"/mo","features":"[Feature]\n[Feature]\n[Feature]","cta_label":"Choose plan","cta_href":"/contact","highlight":true},
    {"name":"[Pro]","price":"$[X]","period":"/mo","features":"[Feature]\n[Feature]\n[Feature]\n[Feature]","cta_label":"Choose plan","cta_href":"/contact","highlight":false}
  ]}}
]'),

('Team grid (3 up)', 'Team', 'Three team profiles side by side.', 1, '[
  {"type":"team_profile","data":{"name":"[Name]","role":"[Role]"},"settings":{"row_id":"team3","row_columns":3}},
  {"type":"team_profile","data":{"name":"[Name]","role":"[Role]"},"settings":{"row_id":"team3","row_columns":3}},
  {"type":"team_profile","data":{"name":"[Name]","role":"[Role]"},"settings":{"row_id":"team3","row_columns":3}}
]'),

('Contact info + form', 'Contact', 'Contact details next to a form, side by side on desktop.', 1, '[
  {"type":"contact_info","data":{"heading":"Get in touch"},"settings":{"row_id":"contact2","row_columns":2}},
  {"type":"lead_form","data":{"heading":"Send a message","form_key":"contact"},"settings":{"row_id":"contact2","row_columns":2}}
]'),

('Stats band (dark)', 'Stats', 'A dark full-width strip of key numbers.', 1, '[
  {"type":"stats","data":{"items":[{"value":"[#]","label":"[Metric]"},{"value":"[#]","label":"[Metric]"},{"value":"[#]","label":"[Metric]"}]},"settings":{"background":"dark"}}
]'),

('FAQ list', 'FAQ', 'A short list of common questions.', 1, '[
  {"type":"faq","data":{"heading":"Questions, answered","items":[{"q":"[Question one]","a":"[Answer]"},{"q":"[Question two]","a":"[Answer]"},{"q":"[Question three]","a":"[Answer]"}]}}
]'),

('3-step process', 'Steps', 'Numbered 1-2-3 steps explaining how it works.', 1, '[
  {"type":"process_steps","data":{"heading":"How it works","items":[{"title":"[Step one]","text":"Short description."},{"title":"[Step two]","text":"Short description."},{"title":"[Step three]","text":"Short description."}]}}
]'),

('Featured listings (3 up)', 'Listings', 'A row of the most recent listings.', 1, '[
  {"type":"listing_grid","data":{"heading":"Featured listings","per_row":3,"per_page":3}}
]'),

('Why choose us checklist', 'Trust', 'A simple checkmarked list of reasons to work with you.', 1, '[
  {"type":"checklist","data":{"heading":"Why choose us","items":[{"text":"[Reason one]"},{"text":"[Reason two]"},{"text":"[Reason three]"},{"text":"[Reason four]"}]}}
]'),

('Trusted-by logos', 'Trust', 'A row of client/partner logos.', 2, '[
  {"type":"logos","data":{"heading":"Trusted by teams at","items":["[Client]","[Client]","[Client]","[Client]"]}}
]'),

('Service areas strip', 'Trust', 'A row of city/area pill links.', 3, '[
  {"type":"service_areas","data":{"heading":"Areas we serve","items":[]}}
]');
