-- "Lead Flows": extends the existing follow_up_sequences/queue engine with a category (so flows can
-- be organized as Tenant / Buyer-Pre-owned / Buyer-Pre-con / Seller / Landlord / Investor / General)
-- and an explicit enrollment record, so a lead's flow memberships are visible and a lead can be in
-- several flows at once. The actual sending mechanics (steps, delays, cron processing) are unchanged.

create type public.lead_flow_category as enum (
  'tenant', 'buyer_preowned', 'buyer_precon', 'seller', 'landlord', 'investor', 'general'
);

alter table public.follow_up_sequences
  add column if not exists category public.lead_flow_category not null default 'general',
  add column if not exists description text;

create table public.lead_flow_enrollments (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references public.leads(id) on delete cascade,
  flow_id      uuid not null references public.follow_up_sequences(id) on delete cascade,
  status       text not null default 'active',   -- active | completed | stopped
  enrolled_by  uuid references auth.users(id),    -- null = automatic (matched on form_key at submission)
  created_at   timestamptz not null default now(),
  unique (lead_id, flow_id)
);
create index on public.lead_flow_enrollments (lead_id);
create index on public.lead_flow_enrollments (flow_id);

alter table public.lead_flow_enrollments enable row level security;
create policy "staff enrollments" on public.lead_flow_enrollments for all
  using (public.has_role(array['admin','sales']::public.app_role[]))
  with check (public.has_role(array['admin','sales']::public.app_role[]));
