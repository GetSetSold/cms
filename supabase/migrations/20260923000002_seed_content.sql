-- =====================================================================
-- Starter content: SVG illustrations, block types, templates, pages,
-- and a default follow-up sequence. Safe to edit afterwards in the admin.
-- SVG colours use classes (c-primary, c-accent, c-ink, c-soft, c-line,
-- c-paper, c-ground) so illustrations follow the theme set in Settings.
-- =====================================================================

insert into public.svg_assets (id, name, tags, markup) values
('00000000-0000-4000-8000-000000000001', 'Hero – building & checklist', '{hero}', $svg$<svg viewBox="0 0 600 520" xmlns="http://www.w3.org/2000/svg"><rect class="c-soft" width="600" height="520"/><circle class="c-accent" cx="450" cy="140" r="92"/><path class="c-line" d="M0 440 Q150 390 300 425 T600 405 V520 H0 Z"/><rect class="c-ink" x="130" y="215" width="240" height="245"/><path class="c-primary" d="M110 220 L250 112 L390 220 Z"/><rect class="c-ground" x="160" y="250" width="48" height="48" rx="4"/><rect class="c-ground" x="226" y="250" width="48" height="48" rx="4"/><rect class="c-ground" x="292" y="250" width="48" height="48" rx="4"/><rect class="c-ground" x="160" y="318" width="48" height="48" rx="4"/><rect class="c-ground" x="292" y="318" width="48" height="48" rx="4"/><rect class="c-primary" x="226" y="390" width="48" height="70" rx="4"/><g transform="translate(395 250)"><rect class="c-paper" width="150" height="185" rx="14"/><rect class="c-ink" x="50" y="-10" width="50" height="20" rx="6"/><path class="s-primary" d="M22 48 l10 10 18 -20 M22 98 l10 10 18 -20 M22 148 l10 10 18 -20" fill="none" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path class="s-line" d="M64 50 H128 M64 100 H118 M64 150 H124" stroke-width="8" stroke-linecap="round"/></g></svg>$svg$),
('00000000-0000-4000-8000-000000000002', 'Layers', '{service}', $svg$<svg viewBox="0 0 360 220" xmlns="http://www.w3.org/2000/svg"><rect class="c-soft" width="360" height="220"/><path class="c-ink" d="M180 150 L270 115 L180 80 L90 115 Z"/><path class="c-accent" d="M180 125 L270 90 L180 55 L90 90 Z"/><path class="c-primary" d="M180 100 L270 65 L180 30 L90 65 Z"/><path class="s-line" d="M60 190 H300" stroke-width="6" stroke-linecap="round"/></svg>$svg$),
('00000000-0000-4000-8000-000000000003', 'Growth chart', '{service}', $svg$<svg viewBox="0 0 360 220" xmlns="http://www.w3.org/2000/svg"><rect class="c-soft" width="360" height="220"/><rect class="c-ink" x="90" y="130" width="36" height="60" rx="4"/><rect class="c-ink" x="142" y="100" width="36" height="90" rx="4"/><rect class="c-ink" x="194" y="70" width="36" height="120" rx="4"/><rect class="c-primary" x="246" y="40" width="36" height="150" rx="4"/><path class="s-accent" d="M80 150 L140 110 L200 90 L270 30" fill="none" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path class="s-line" d="M60 190 H300" stroke-width="6" stroke-linecap="round"/></svg>$svg$),
('00000000-0000-4000-8000-000000000004', 'Shield check', '{service}', $svg$<svg viewBox="0 0 360 220" xmlns="http://www.w3.org/2000/svg"><rect class="c-soft" width="360" height="220"/><circle class="c-accent" cx="250" cy="70" r="34"/><path class="c-primary" d="M180 30 L240 52 V108 C240 150 212 176 180 190 C148 176 120 150 120 108 V52 Z"/><path class="s-paper" d="M154 110 l18 18 34 -38" fill="none" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>$svg$),
('00000000-0000-4000-8000-000000000005', 'Team', '{about}', $svg$<svg viewBox="0 0 600 420" xmlns="http://www.w3.org/2000/svg"><rect class="c-soft" width="600" height="420"/><circle class="c-accent" cx="480" cy="110" r="60"/><circle class="c-ink" cx="200" cy="170" r="48"/><path class="c-ink" d="M110 330 C120 250 280 250 290 330 Z"/><circle class="c-primary" cx="360" cy="190" r="42"/><path class="c-primary" d="M280 340 C290 270 430 270 440 340 Z"/><path class="c-line" d="M0 340 H600 V420 H0 Z"/></svg>$svg$);

insert into public.block_types (key, name, category, default_data) values
('hero',         'Hero',            'hero',         '{"eyebrow":"","heading":"Your headline here","heading_accent":"","subheading":"","primary_cta":{"label":"Get a free quote","href":"#quote"},"secondary_cta":{"label":"","href":""},"svg_id":"00000000-0000-4000-8000-000000000001","layout":"split","badge":{"label":"","value":""}}'),
('logos',        'Logo strip',      'social-proof', '{"heading":"Trusted by teams at","items":["[Client]","[Client]","[Client]","[Client]"]}'),
('services',     'Services',        'content',      '{"heading":"What we do","link":{"label":"All services","href":"/services"},"items":[{"title":"[Service one]","text":"What the client gets and why it matters.","svg_id":"00000000-0000-4000-8000-000000000002","href":""},{"title":"[Service two]","text":"What the client gets and why it matters.","svg_id":"00000000-0000-4000-8000-000000000003","href":""},{"title":"[Service three]","text":"What the client gets and why it matters.","svg_id":"00000000-0000-4000-8000-000000000004","href":""}]}'),
('features',     'Features grid',   'content',      '{"heading":"Why choose us","intro":"","items":[{"title":"[Reason]","text":"One short sentence."},{"title":"[Reason]","text":"One short sentence."},{"title":"[Reason]","text":"One short sentence."}]}'),
('stats',        'Stats',           'social-proof', '{"items":[{"value":"[#]","label":"Projects completed"},{"value":"[#]","label":"Years in business"},{"value":"[#]","label":"Average rating"},{"value":"[#]","label":"Repeat clients"}]}'),
('testimonials', 'Testimonials',    'social-proof', '{"heading":"","items":[{"quote":"[Client testimonial]","name":"[Client name]","role":"[Role, company]"},{"quote":"[Client testimonial]","name":"[Client name]","role":"[Role, company]"}]}'),
('faq',          'FAQ',             'content',      '{"heading":"Questions, answered","items":[{"q":"How fast can you start?","a":"[Answer]"},{"q":"Do you offer fixed pricing?","a":"[Answer]"},{"q":"What areas do you serve?","a":"[Answer]"}]}'),
('cta',          'Call to action',  'content',      '{"heading":"Ready when you are.","text":"","button":{"label":"Get a quote","href":"/contact"}}'),
('lead_form',    'Lead form',       'form',         '{"heading":"Request a quote","text":"We reply within one business day.","form_key":"quote","submit_label":"Request my quote","success_message":"Thanks — we will be in touch shortly.","show_email":true,"show_message":true,"show_sms_opt_in":true}'),
('rich_text',    'Text',            'content',      '{"heading":"","body":""}'),
('text_svg',     'Text + illustration','content',   '{"heading":"","body":"","svg_id":"00000000-0000-4000-8000-000000000005","side":"right"}'),
('pricing',      'Pricing',         'content',      '{"heading":"Pricing","plans":[{"name":"[Plan]","price":"[Price]","period":"","features":"[Feature]\n[Feature]","cta_label":"Get started","cta_href":"/contact","highlight":false}]}'),
('contact_info', 'Contact details', 'content',      '{"heading":"Contact us"}');

insert into public.templates (name, slug, page_type, description, blocks) values
('Home', 'home', 'page', 'Hero, services, proof, FAQ, form', '[
  {"type":"hero","data":{"eyebrow":"[Service area] · Licensed & insured","heading":"Work done right, from first call to","heading_accent":"final walkthrough.","subheading":"Tell us what you need. We reply within one business day with a clear plan and a fixed quote.","secondary_cta":{"label":"See our services","href":"/services"},"badge":{"label":"Average reply time","value":"[X] hours"}}},
  {"type":"logos"},{"type":"services"},{"type":"stats","settings":{"background":"dark"}},
  {"type":"testimonials"},{"type":"faq"},{"type":"lead_form","settings":{"anchor":"quote","background":"muted"}}]'),
('About', 'about', 'page', 'Story, values, stats', '[
  {"type":"hero","data":{"heading":"About","heading_accent":"[Brand]","layout":"centered","svg_id":null,"primary_cta":{"label":"Work with us","href":"/contact"}}},
  {"type":"text_svg","data":{"heading":"Our story","body":"[Two or three short paragraphs about how the business started and what you care about.]"}},
  {"type":"features","data":{"heading":"What we value"}},{"type":"stats","settings":{"background":"dark"}},{"type":"cta"}]'),
('Services', 'services', 'page', 'Services, pricing, FAQ, form', '[
  {"type":"hero","data":{"heading":"Services","layout":"centered","svg_id":null,"subheading":"[One line on what you offer and who it is for.]"}},
  {"type":"services","data":{"heading":"","link":{"label":"","href":""}}},{"type":"pricing"},{"type":"faq"},{"type":"lead_form","settings":{"anchor":"quote","background":"muted"}}]'),
('Contact', 'contact', 'page', 'Form and details', '[
  {"type":"hero","data":{"heading":"Let''s talk","layout":"centered","svg_id":null,"primary_cta":{"label":"","href":""}}},
  {"type":"lead_form","data":{"form_key":"contact","heading":"Send us a message"}},{"type":"contact_info"}]'),
('Lead-gen landing', 'landing', 'landing', 'No navigation, form first', '[
  {"type":"hero","data":{"layout":"form","heading":"[Offer headline]","subheading":"[Why act now.]"}},
  {"type":"logos"},{"type":"features"},{"type":"testimonials"},{"type":"faq"},{"type":"lead_form","data":{"form_key":"landing"},"settings":{"anchor":"quote","background":"muted"}}]');

-- Starter pages (published so the site works immediately)
do $$
declare t record; v uuid;
begin
  for t in select id, slug, name from public.templates loop
    v := public.create_page_from_template(
           t.id,
           t.name,
           case t.slug when 'landing' then 'landing/offer' else t.slug end);
    update public.pages set status = 'published', publish_at = now() where id = v;
  end loop;
end $$;

insert into public.follow_up_sequences (name, trigger, form_key, steps) values
('Welcome sequence', 'lead_created', null, '[
  {"delay_minutes":0,    "channel":"sms",   "template":"Hi {{first_name}}, thanks for contacting {{site_name}}. We will call you shortly."},
  {"delay_minutes":1440, "channel":"email", "subject":"Your request with {{site_name}}", "template":"Hi {{first_name}},\n\nThanks again for reaching out. Reply to this email with any details that help us quote accurately.\n\n{{site_name}}"},
  {"delay_minutes":4320, "channel":"sms",   "template":"Hi {{first_name}}, still looking for help with your project? Reply here and we will get back to you."}
]');
