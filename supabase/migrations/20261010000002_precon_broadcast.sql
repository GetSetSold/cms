-- Pre-con broadcast: subscriber list + send log.
-- Run in the CMS Supabase project (atmrjimfcydgjonlxzvr) SQL editor.

create table if not exists public.precon_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  first_name text,
  lead_id uuid,
  is_active boolean not null default true,
  unsubscribe_token text not null default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now()
);
create index if not exists precon_subscribers_email_idx on public.precon_subscribers (lower(email));
create index if not exists precon_subscribers_token_idx on public.precon_subscribers (unsubscribe_token);

create table if not exists public.precon_broadcasts (
  id uuid primary key default gen_random_uuid(),
  project_id text,
  project_name text,
  project_slug text,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.precon_broadcast_sends (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references public.precon_broadcasts(id) on delete cascade,
  subscriber_id uuid references public.precon_subscribers(id) on delete set null,
  email text not null,
  status text not null default 'sent',
  error text,
  sent_at timestamptz not null default now()
);
create index if not exists precon_broadcast_sends_broadcast_idx on public.precon_broadcast_sends (broadcast_id);
