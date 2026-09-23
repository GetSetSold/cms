-- =====================================================================
-- Supabase CMS + Leads — core schema
-- =====================================================================
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. Users & roles
-- ---------------------------------------------------------------------
create type public.app_role as enum ('admin', 'editor', 'sales');

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  role        public.app_role not null default 'editor',
  created_at  timestamptz not null default now()
);

create or replace function public.has_role(roles public.app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = any(roles));
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2. Site settings (single row)
-- ---------------------------------------------------------------------
create table public.site_settings (
  id             int primary key default 1 check (id = 1),
  site_name      text not null default 'My Site',
  logo_svg_id    uuid,
  theme          jsonb not null default '{"primary":"#0E5C55","accent":"#B8581F","ink":"#15171C","ground":"#F5F3EE"}',
  seo_defaults   jsonb not null default '{"title_suffix":" | My Site","description":"","site_url":""}',
  navigation     jsonb not null default '[{"label":"Home","href":"/"},{"label":"About","href":"/about"},{"label":"Services","href":"/services"},{"label":"Contact","href":"/contact"}]',
  header_cta     jsonb not null default '{"label":"Get a quote","href":"/contact"}',
  footer         jsonb not null default '{"tagline":"","columns":[]}',
  contact        jsonb not null default '{"phone":"","email":"","address":"","hours":""}',
  social_links   jsonb not null default '{}',
  scripts        jsonb not null default '{"ga4_id":""}',
  lead_settings  jsonb not null default '{"notify_emails":[]}',
  updated_at     timestamptz not null default now()
);
insert into public.site_settings (id) values (1);

-- ---------------------------------------------------------------------
-- 3. SVG library (the site uses SVG only — no raster images)
-- ---------------------------------------------------------------------
create table public.svg_assets (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  markup      text not null,
  tags        text[] not null default '{}',
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  -- Defence in depth: the admin sanitizes with DOMPurify before saving,
  -- and the database refuses anything that could execute script.
  constraint svg_is_svg  check (markup ~* '^\s*<svg[\s>]'),
  constraint svg_is_safe check (markup !~* '(<script|<foreignobject|<iframe|<embed|<object|javascript:|\son[a-z]+\s*=|xlink:href\s*=\s*["'']?\s*(https?:|data:)|href\s*=\s*["'']?\s*(https?:|data:))'),
  constraint svg_size    check (length(markup) <= 200000)
);

alter table public.site_settings
  add constraint site_settings_logo_fk foreign key (logo_svg_id) references public.svg_assets(id) on delete set null;

-- ---------------------------------------------------------------------
-- 4. Block library & templates
-- ---------------------------------------------------------------------
create table public.block_types (
  key          text primary key,
  name         text not null,
  category     text not null default 'content',
  default_data jsonb not null default '{}',
  is_active    boolean not null default true
);

create table public.templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  page_type   text not null default 'page',
  description text,
  blocks      jsonb not null default '[]',   -- [{type, data?, settings?}]
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. Pages & sections
-- ---------------------------------------------------------------------
create type public.page_status as enum ('draft', 'scheduled', 'published', 'archived');

create table public.pages (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text unique not null check (slug ~ '^[a-z0-9]+(?:[-/][a-z0-9]+)*$'),  -- 'home' = site root
  page_type       text not null default 'page',
  template_id     uuid references public.templates(id) on delete set null,
  status          public.page_status not null default 'draft',
  publish_at      timestamptz,
  seo_title       text,
  seo_description text,
  og_svg_id       uuid references public.svg_assets(id) on delete set null,
  canonical_url   text,
  noindex         boolean not null default false,
  hide_nav        boolean not null default false,
  hide_footer     boolean not null default false,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.page_sections (
  id          uuid primary key default gen_random_uuid(),
  page_id     uuid not null references public.pages(id) on delete cascade,
  block_type  text not null references public.block_types(key),
  position    int not null default 0,
  data        jsonb not null default '{}',
  settings    jsonb not null default '{}',   -- background, hide_on_mobile, hide_on_desktop, anchor
  is_visible  boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on public.page_sections (page_id, position);

create table public.page_revisions (
  id          uuid primary key default gen_random_uuid(),
  page_id     uuid not null references public.pages(id) on delete cascade,
  snapshot    jsonb not null,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. Leads
-- ---------------------------------------------------------------------
create type public.lead_status as enum ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost');

create table public.leads (
  id                uuid primary key default gen_random_uuid(),
  first_name        text,
  last_name         text,
  email             text,
  phone             text,
  company           text,
  message           text,
  service           text,
  source_page       uuid references public.pages(id) on delete set null,
  source_path       text,
  form_key          text,
  utm               jsonb not null default '{}',
  custom_fields     jsonb not null default '{}',
  status            public.lead_status not null default 'new',
  assigned_to       uuid references auth.users(id),
  sms_opt_in        boolean not null default false,
  sms_opted_out     boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index on public.leads (status, created_at desc);
create index on public.leads (phone);

create table public.lead_activities (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  type        text not null,   -- note | sms_out | sms_in | email_out | status_change | system
  body        text,
  meta        jsonb not null default '{}',
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);
create index on public.lead_activities (lead_id, created_at desc);

create table public.follow_up_sequences (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  trigger     text not null default 'lead_created',
  form_key    text,                          -- null = every form
  is_active   boolean not null default true,
  steps       jsonb not null default '[]'
  -- [{"delay_minutes":0,"channel":"sms","template":"Hi {{first_name}}..."},
  --  {"delay_minutes":1440,"channel":"email","subject":"...","template":"..."}]
);

create table public.follow_up_queue (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references public.leads(id) on delete cascade,
  sequence_id  uuid not null references public.follow_up_sequences(id) on delete cascade,
  step_index   int not null,
  channel      text not null,
  run_at       timestamptz not null,
  status       text not null default 'pending',   -- pending | processing | sent | failed | skipped
  attempts     int not null default 0,
  last_error   text,
  created_at   timestamptz not null default now()
);
create index on public.follow_up_queue (status, run_at);

-- ---------------------------------------------------------------------
-- 7. Triggers
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger t_pages    before update on public.pages         for each row execute function public.touch_updated_at();
create trigger t_sections before update on public.page_sections for each row execute function public.touch_updated_at();
create trigger t_leads    before update on public.leads         for each row execute function public.touch_updated_at();
create trigger t_settings before update on public.site_settings for each row execute function public.touch_updated_at();

create or replace function public.log_lead_status() returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    insert into public.lead_activities (lead_id, type, body, created_by)
    values (new.id, 'status_change', old.status || ' → ' || new.status, auth.uid());
  end if;
  return new;
end $$;
create trigger t_lead_status after update on public.leads for each row execute function public.log_lead_status();

-- ---------------------------------------------------------------------
-- 8. RPCs used by the admin
-- ---------------------------------------------------------------------
-- New page from a template: copies each template block, merged over the block's defaults
create or replace function public.create_page_from_template(p_template uuid, p_title text, p_slug text)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_page uuid;
  v_type text;
begin
  select page_type into v_type from templates where id = p_template;
  insert into pages (title, slug, page_type, template_id, created_by)
  values (p_title, p_slug, coalesce(v_type, 'page'), p_template, auth.uid())
  returning id into v_page;

  insert into page_sections (page_id, block_type, position, data, settings)
  select v_page,
         b.value->>'type',
         (b.ordinality - 1)::int,
         coalesce(bt.default_data, '{}') || coalesce(b.value->'data', '{}'),
         coalesce(b.value->'settings', '{}')
  from templates t
  cross join lateral jsonb_array_elements(t.blocks) with ordinality b
  join block_types bt on bt.key = b.value->>'type'
  where t.id = p_template;

  if v_type = 'landing' then
    update pages set hide_nav = true where id = v_page;
  end if;
  return v_page;
end $$;

-- Publish: snapshot the page + sections, then flip status
create or replace function public.publish_page(p_page uuid)
returns void language plpgsql security invoker set search_path = public as $$
begin
  insert into page_revisions (page_id, snapshot, created_by)
  select p.id,
         jsonb_build_object(
           'page', to_jsonb(p),
           'sections', coalesce((select jsonb_agg(to_jsonb(s) order by s.position)
                                 from page_sections s where s.page_id = p.id), '[]')),
         auth.uid()
  from pages p where p.id = p_page;

  update pages set status = 'published', publish_at = coalesce(publish_at, now()) where id = p_page;
end $$;

-- ---------------------------------------------------------------------
-- 9. Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.site_settings       enable row level security;
alter table public.svg_assets          enable row level security;
alter table public.block_types         enable row level security;
alter table public.templates           enable row level security;
alter table public.pages               enable row level security;
alter table public.page_sections       enable row level security;
alter table public.page_revisions      enable row level security;
alter table public.leads               enable row level security;
alter table public.lead_activities     enable row level security;
alter table public.follow_up_sequences enable row level security;
alter table public.follow_up_queue     enable row level security;

-- Public (anon) can read what the website needs
create policy "read settings"  on public.site_settings for select using (true);
create policy "read svgs"      on public.svg_assets    for select using (true);
create policy "read blocks"    on public.block_types   for select using (true);
create policy "read templates" on public.templates     for select using (public.has_role(array['admin','editor']::public.app_role[]));

create policy "read live pages" on public.pages for select using (
  status = 'published'
  or (status = 'scheduled' and publish_at <= now())
  or public.has_role(array['admin','editor']::public.app_role[])
);
create policy "read live sections" on public.page_sections for select using (
  exists (select 1 from public.pages p where p.id = page_id
          and (p.status = 'published' or (p.status = 'scheduled' and p.publish_at <= now())))
  or public.has_role(array['admin','editor']::public.app_role[])
);

-- Editors & admins: content
create policy "edit pages"     on public.pages          for all using (public.has_role(array['admin','editor']::public.app_role[])) with check (public.has_role(array['admin','editor']::public.app_role[]));
create policy "edit sections"  on public.page_sections  for all using (public.has_role(array['admin','editor']::public.app_role[])) with check (public.has_role(array['admin','editor']::public.app_role[]));
create policy "edit revisions" on public.page_revisions for all using (public.has_role(array['admin','editor']::public.app_role[])) with check (public.has_role(array['admin','editor']::public.app_role[]));
create policy "edit svgs"      on public.svg_assets     for all using (public.has_role(array['admin','editor']::public.app_role[])) with check (public.has_role(array['admin','editor']::public.app_role[]));

-- Admins only
create policy "admin settings"  on public.site_settings       for update using (public.has_role(array['admin']::public.app_role[]));
create policy "admin templates" on public.templates           for all using (public.has_role(array['admin']::public.app_role[])) with check (public.has_role(array['admin']::public.app_role[]));
create policy "admin blocks"    on public.block_types         for all using (public.has_role(array['admin']::public.app_role[])) with check (public.has_role(array['admin']::public.app_role[]));
create policy "admin sequences" on public.follow_up_sequences for all using (public.has_role(array['admin']::public.app_role[])) with check (public.has_role(array['admin']::public.app_role[]));
create policy "staff read sequences" on public.follow_up_sequences for select using (public.has_role(array['admin','sales']::public.app_role[]));
create policy "staff queue"     on public.follow_up_queue     for select using (public.has_role(array['admin','sales']::public.app_role[]));
create policy "staff skip queue" on public.follow_up_queue    for update using (public.has_role(array['admin','sales']::public.app_role[]));

create policy "own profile"    on public.profiles for select using (id = auth.uid() or public.has_role(array['admin']::public.app_role[]));
create policy "admin profiles" on public.profiles for update using (public.has_role(array['admin']::public.app_role[]));

-- Leads: sales + admin. Public submissions go through the submit-lead Edge Function.
create policy "staff leads"      on public.leads           for all using (public.has_role(array['admin','sales']::public.app_role[])) with check (public.has_role(array['admin','sales']::public.app_role[]));
create policy "staff activities" on public.lead_activities for all using (public.has_role(array['admin','sales']::public.app_role[])) with check (public.has_role(array['admin','sales']::public.app_role[]));
