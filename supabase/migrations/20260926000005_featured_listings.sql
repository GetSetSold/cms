-- Featured Listings: a curated, ordered list for the admin to control what
-- shows in a "Featured" grid — separate from Sold History (closed deals)
-- and separate from the live DDF sync (which shows *everything*, not a
-- curated pick). Each row is either:
--   - MLS-linked (listing_key set): price/photo/beds/baths resolved live
--     from the already-synced board-wide DDF data, for your own brokerage's
--     listings or a friend agent's — same mechanism either way, since
--     board-wide DDF access means any real MLS# resolves.
--   - Private (listing_key null): fully manual fields, no MLS# exists.

create table public.featured_listings (
  id           uuid primary key default gen_random_uuid(),
  source_type  text not null default 'brokerage' check (source_type in ('brokerage', 'friend', 'private')),
  listing_key  text,          -- set = MLS-linked (resolved live); null = private/manual
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  -- Manual fields — used only when listing_key is null.
  address      text,
  price        numeric,
  bed          int,
  bath         int,
  sqft         int,
  image_url    text,
  link         text,
  note         text,          -- e.g. "New listing", shown as a small badge on either type
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on public.featured_listings (is_active, sort_order);

create trigger t_featured_listings before update on public.featured_listings for each row execute function public.touch_updated_at();

alter table public.featured_listings enable row level security;
create policy "read featured listings" on public.featured_listings for select using (true);
create policy "manage featured listings" on public.featured_listings for all
  using (public.has_role(array['admin','editor']::public.app_role[]))
  with check (public.has_role(array['admin','editor']::public.app_role[]));

insert into public.block_types (key, name, category, default_data) values
('featured_listings_grid', 'Featured Listings (curated)', 'content', '{"heading":"Featured Listings","count":6,"link_label":"View all listings"}');
