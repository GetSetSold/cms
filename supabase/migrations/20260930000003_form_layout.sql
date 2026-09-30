-- The "Layout" picker (Standard / Side panel) was added to the form editor's UI and type, but the
-- column was never added and the save payload never included it — so picking "Side panel" always
-- reverted to Standard on save. Same class of bug as choice_style/theme before this.
alter table public.forms add column if not exists layout text;
