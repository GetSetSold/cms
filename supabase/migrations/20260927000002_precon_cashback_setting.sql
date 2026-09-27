alter table public.site_settings add column if not exists precon_cashback jsonb not null default '{"enabled":false,"type":"percent","value":1}';
