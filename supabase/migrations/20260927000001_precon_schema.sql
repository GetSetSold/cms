-- Pre-Construction: builders → projects → models. Manually managed, same
-- reasoning as Sold History — this isn't DDF-synced data, so it lives in
-- the CMS's own database where full read/write already works.

create table public.precon_builders (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  logo_url     text,
  tagline      text,
  description  text,
  incentive_title text,
  incentive_description text,
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.precon_projects (
  id           uuid primary key default gen_random_uuid(),
  builder_id   uuid not null references public.precon_builders(id) on delete cascade,
  slug         text not null,
  name         text not null,
  city         text,
  address      text,
  latitude     numeric,
  longitude    numeric,
  status       text not null default 'Coming Soon' check (status in ('Selling Now', 'Coming Soon', 'Sold Out')),
  price_from   numeric,
  beds_min     int, beds_max     int,
  baths_min    int, baths_max    int,
  sqft_min     int, sqft_max     int,
  vip_release_date date,
  cashback_amount numeric,
  description  text,
  gallery      text[] not null default '{}',
  amenities    text[] not null default '{}',
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (builder_id, slug)
);
create index on public.precon_projects (builder_id);
create index on public.precon_projects (city);
create index on public.precon_projects (status);

create table public.precon_models (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.precon_projects(id) on delete cascade,
  slug         text not null,
  name         text not null,
  status       text not null default 'Pre-Construction' check (status in ('Move-In Ready', 'Pre-Construction')),
  price_from   numeric,
  bedrooms     int, bathrooms int, sqft int, storeys int,
  building_type text, -- e.g. Condo / Townhome / Detached
  move_in_date text,  -- free text ("TBA", "Fall 2027", etc.) — rarely a precise date this far out
  cashback_amount numeric,
  gallery      text[] not null default '{}',
  floor_plans  text[] not null default '{}',
  payment_plan jsonb not null default '[]', -- [{"milestone":"At signing","percent":5}, ...]
  amenities    text[] not null default '{}',
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (project_id, slug)
);
create index on public.precon_models (project_id);
create index on public.precon_models (status);

create trigger t_precon_builders before update on public.precon_builders for each row execute function public.touch_updated_at();
create trigger t_precon_projects before update on public.precon_projects for each row execute function public.touch_updated_at();
create trigger t_precon_models before update on public.precon_models for each row execute function public.touch_updated_at();

alter table public.precon_builders enable row level security;
alter table public.precon_projects enable row level security;
alter table public.precon_models enable row level security;

create policy "read precon builders" on public.precon_builders for select using (true);
create policy "manage precon builders" on public.precon_builders for all
  using (public.has_role(array['admin','editor']::public.app_role[]))
  with check (public.has_role(array['admin','editor']::public.app_role[]));

create policy "read precon projects" on public.precon_projects for select using (true);
create policy "manage precon projects" on public.precon_projects for all
  using (public.has_role(array['admin','editor']::public.app_role[]))
  with check (public.has_role(array['admin','editor']::public.app_role[]));

create policy "read precon models" on public.precon_models for select using (true);
create policy "manage precon models" on public.precon_models for all
  using (public.has_role(array['admin','editor']::public.app_role[]))
  with check (public.has_role(array['admin','editor']::public.app_role[]));

insert into public.block_types (key, name, category, default_data) values
('precon_projects_grid', 'Pre-Construction Projects (filterable grid)', 'content', '{"heading":"All Pre-Construction Projects","show_filters":true,"show_stats":true,"show_map":true}');
