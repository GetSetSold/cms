alter table public.forms add column if not exists paginate boolean not null default false;
-- Section background colors live inside the existing `sections` jsonb column
-- (each section may carry an optional "background" hex string) — no schema
-- change needed for that part.
