-- Redirects manager v1 — Admin-managed page / short-link redirects.
--
-- How it works (see src/lib/redirects.ts and the CMS slug page):
-- - A redirect only fires when a URL would otherwise 404 as a CMS page.
--   Real pages and real routes always win, so a bad redirect row can
--   never take down a live section of the site.
-- - Destinations are internal paths only in v1 (no external URLs, so the
--   site can never be used as an open redirect).
-- - The lookup runs only on a page miss, never on normal page loads, so
--   there is no per-page query cost and no cache to invalidate: saving a
--   redirect in Admin takes effect on the next hit of that URL.
-- - System routes (city legacy URLs, listing slugs, /rohit) stay in
--   next.config.ts — this table is for page and short-link redirects only.
create table public.redirects (
  id           uuid primary key default gen_random_uuid(),
  source       text not null unique,
  destination  text not null,
  permanent    boolean not null default true,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index redirects_source_idx on public.redirects (source) where is_active;

alter table public.redirects enable row level security;
-- Public read: sources and destinations are public URLs by definition,
-- and the slug page (anon key, no visitor session) must be able to look
-- a redirect up when a page is missing.
create policy "read redirects" on public.redirects for select using (true);
-- Admin / editor manage; same role check as featured_listings.
create policy "manage redirects" on public.redirects for all
  using (public.has_role(array['admin','editor']::public.app_role[]))
  with check (public.has_role(array['admin','editor']::public.app_role[]));

-- Explicit API grants: tables created after 2026-10-30 get no automatic
-- PostgREST grants, and this table must be readable by the anon key
-- (slug-page lookup) and writable by logged-in staff. SELECT only for
-- anon — never INSERT/UPDATE/DELETE, which stay staff-only via RLS.
grant select on public.redirects to anon;
grant select, insert, update, delete on public.redirects to authenticated;
