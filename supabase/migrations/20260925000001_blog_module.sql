-- Blog / Updates module.
--
-- A post has: optional blocks BEFORE the writing area, a markdown writing
-- area (the actual article body), and optional blocks AFTER it. Categories
-- carry their own default before/after blocks ("template") so every new
-- post in that category starts consistent — e.g. every "For Sale" post
-- could default to a Featured Listing block after the writing area.

create table public.blog_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  template_blocks_before jsonb not null default '[]',
  template_blocks_after  jsonb not null default '[]',
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table public.blog_posts (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  category_id     uuid references public.blog_categories(id) on delete set null,
  excerpt         text,
  cover_svg_id    uuid references public.svg_assets(id) on delete set null,
  blocks_before   jsonb not null default '[]',
  content_md      text not null default '',   -- the writing area, as markdown
  blocks_after    jsonb not null default '[]',
  author_name     text,
  author_role     text,
  author_bio      text,
  author_svg_id   uuid references public.svg_assets(id) on delete set null,
  status          public.page_status not null default 'draft', -- reuses the enum pages already use
  publish_at      timestamptz,
  seo_title       text,
  seo_description text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (category_id, slug)
);
create index on public.blog_posts (category_id, status, publish_at desc);

create trigger t_blog_posts before update on public.blog_posts for each row execute function public.touch_updated_at();

alter table public.blog_categories enable row level security;
alter table public.blog_posts      enable row level security;

create policy "read categories" on public.blog_categories for select using (true);
create policy "manage categories" on public.blog_categories for all
  using (public.has_role(array['admin','editor']::public.app_role[]))
  with check (public.has_role(array['admin','editor']::public.app_role[]));

create policy "read published posts" on public.blog_posts for select using (
  status = 'published' or (status = 'scheduled' and publish_at <= now())
  or public.has_role(array['admin','editor']::public.app_role[])
);
create policy "manage posts" on public.blog_posts for all
  using (public.has_role(array['admin','editor']::public.app_role[]))
  with check (public.has_role(array['admin','editor']::public.app_role[]));

-- Starter categories — exactly the ones already in use on the live site,
-- plus Bank of Canada. Admins can add/edit/reorder any of these later.
insert into public.blog_categories (name, slug, sort_order) values
('Buying', 'buying', 1),
('Selling', 'selling', 2),
('Investing', 'investing', 3),
('Renting', 'renting', 4),
('Pre-Construction', 'pre-construction', 5),
('For Lease', 'for-lease', 6),
('For Sale', 'for-sale', 7),
('Bank of Canada', 'bank-of-canada', 8);

-- New embeddable blocks: a single featured listing (for "For Sale"/"For
-- Lease" posts), and a blog grid/swipe block for showing recent posts on
-- any other page (home, services, etc.) — matches the approved mock.
insert into public.block_types (key, name, category, default_data) values
('featured_listing', 'Featured listing', 'content', '{"heading":"Featured listing","listing_key":""}'),
('blog_grid', 'Blog posts', 'content', '{"heading":"Latest insights","layout":"grid","count":3,"category_slug":"","link_label":"View all posts"}');
