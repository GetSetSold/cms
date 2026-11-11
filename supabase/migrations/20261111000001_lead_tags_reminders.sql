-- Lead tags + manual follow-up reminders (Admin → Leads).
-- Run in pcgggfqndoaoddcrechr (Supabase dashboard → SQL editor).
--
-- Tags: a text[] column on leads. Property-type tags (Detached, Townhouse,
-- Apartment, Condo) plus any custom tag, multi-select. The admin UI reads
-- and writes this column; no new table, so no new-table grants needed.
alter table public.leads add column if not exists tags text[] not null default '{}';

-- Reminders: one row per manual follow-up reminder ("call Tuesday").
-- Shown on the lead and in a "Follow-ups due" list on the Leads page.
create table public.lead_reminders (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads(id) on delete cascade,
  remind_at  timestamptz not null,
  note       text not null default '',
  done       boolean not null default false,
  created_at timestamptz not null default now()
);
create index lead_reminders_due_idx on public.lead_reminders (remind_at) where not done;
create index lead_reminders_lead_idx on public.lead_reminders (lead_id);

alter table public.lead_reminders enable row level security;
-- Staff-only (admin + sales, same as leads / lead_activities).
create policy "staff reminders" on public.lead_reminders for all
  using (public.has_role(array['admin','sales']::public.app_role[]))
  with check (public.has_role(array['admin','sales']::public.app_role[]));

-- Explicit API grants: tables created after 2026-10-30 get no automatic
-- PostgREST grants. Staff-only: no anon grant, authenticated gets full access.
grant select, insert, update, delete on public.lead_reminders to authenticated;
