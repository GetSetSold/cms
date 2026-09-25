-- Reusable authors, instead of retyping name/role/bio/avatar on every post —
-- and tags, which genuinely help SEO (topical clustering, more specific
-- internal linking, and we feed them into the Article schema's `keywords`).

create table public.blog_authors (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  role       text,
  bio        text,
  avatar_svg_id uuid references public.svg_assets(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.blog_authors enable row level security;
create policy "read authors" on public.blog_authors for select using (true);
create policy "manage authors" on public.blog_authors for all
  using (public.has_role(array['admin','editor']::public.app_role[]))
  with check (public.has_role(array['admin','editor']::public.app_role[]));

alter table public.blog_posts add column if not exists author_id uuid references public.blog_authors(id) on delete set null;
alter table public.blog_posts add column if not exists tags text[] not null default '{}';

-- Carry over any post that already has freeform author text into a real
-- author row, so nothing already written loses its byline.
insert into public.blog_authors (name, role, bio, avatar_svg_id)
select distinct author_name, author_role, author_bio, author_svg_id
from public.blog_posts
where author_name is not null and author_id is null
on conflict do nothing;

update public.blog_posts p
set author_id = a.id
from public.blog_authors a
where p.author_id is null and p.author_name = a.name;

-- The freeform columns are now superseded by author_id — kept in place
-- (not dropped) so no data is destroyed, simply unused going forward.
