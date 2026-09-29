-- Choice style ("simple"/"boxed") and Appearance ("light"/"dark") for the public form renderer.
-- Added in code earlier but the columns and the save payload were never wired up — this and the
-- FormEditor fix below correct that; the setting has never actually persisted until now.
alter table public.forms add column if not exists choice_style text;
alter table public.forms add column if not exists theme text;
