-- Pre-con subscriptions: lead-based with filter criteria.
-- Replaces the email-only precon_subscribers model.
-- Run in the CMS Supabase project (atmrjimfcydgjonlxzvr) SQL editor.

create table if not exists public.precon_subscriptions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  email text not null,
  first_name text,
  -- filters: { all_projects: boolean, cities: text[], min_price: number, max_price: number, builder_ids: text[] }
  filters jsonb not null default '{"all_projects": true}'::jsonb,
  is_active boolean not null default true,
  unsubscribe_token text not null default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now()
);
create index if not exists precon_subscriptions_email_idx on public.precon_subscriptions (lower(email));
create index if not exists precon_subscriptions_lead_idx on public.precon_subscriptions (lead_id);
create index if not exists precon_subscriptions_token_idx on public.precon_subscriptions (unsubscribe_token);

-- Migrate existing subscribers as "all projects" subscriptions (if the old table exists).
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'precon_subscribers') then
    insert into public.precon_subscriptions (lead_id, email, first_name, filters, is_active, unsubscribe_token)
    select lead_id, email, first_name, '{"all_projects": true}'::jsonb, is_active, unsubscribe_token
    from public.precon_subscribers
    on conflict do nothing;
  end if;
end $$;
