alter table public.site_settings add column if not exists blog_cta jsonb not null default '{}';

update public.site_settings
set blog_cta = '{
  "heading": "Have a question about this?",
  "text": "Get in touch and we''ll help you figure out the right move.",
  "button_label": "Contact us",
  "button_href": "/contact"
}'::jsonb
where id = 1 and not (blog_cta ? 'heading');
