-- Forms module. A form is either:
--   - field-built: `fields` describes the inputs, submissions go through the
--     existing submit-lead pipeline (so answers land in leads + follow-ups
--     fire normally, with extra answers in leads.custom_fields), or
--   - embedded: `embed_html` is rendered as-is (e.g. a Zoho/Typeform embed).
--     Only admins/editors can save embed_html — same trust boundary as the
--     SVG library and other admin-authored HTML fragments in this schema.
-- Every form also gets a standalone page automatically at /forms/[slug].

create table public.forms (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  slug           text unique not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description    text,
  fields         jsonb not null default '[]',
  -- [{"key":"pets","label":"Do you have pets?","type":"select","required":false,"options":["Yes","No"]}]
  embed_html     text,
  submit_label   text not null default 'Submit',
  success_message text not null default 'Thanks — we''ll be in touch shortly.',
  form_key       text not null, -- groups submissions the same way lead_form blocks already do
  is_active      boolean not null default true,
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint embed_is_safe check (
    embed_html is null or
    embed_html !~* '(<script[^>]*\ssrc\s*=(?!\s*["'']?https://forms\.zohopublic\.com)|javascript:)'
  )
);
create index on public.forms (form_key);

create trigger t_forms before update on public.forms for each row execute function public.touch_updated_at();

alter table public.forms enable row level security;

create policy "read active forms" on public.forms for select
  using (is_active or public.has_role(array['admin','editor']::public.app_role[]));
create policy "edit forms" on public.forms for all
  using (public.has_role(array['admin','editor']::public.app_role[]))
  with check (public.has_role(array['admin','editor']::public.app_role[]));

-- Block type: embed a form inside any page via the page builder.
insert into public.block_types (key, name, category, default_data) values
('custom_form', 'Custom form', 'form', '{"form_slug":"","heading":"","text":""}');
