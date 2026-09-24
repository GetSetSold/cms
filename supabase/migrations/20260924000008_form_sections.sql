-- Forms now use `sections` (grouped fields, each section with its own 1 or 2
-- column layout — mobile always renders single column regardless) instead of
-- a flat `fields` array. This also adds a "subform" field type (a repeatable
-- nested group, e.g. "Add another applicant").

alter table public.forms add column if not exists sections jsonb not null default '[]';

-- Wrap any existing flat `fields` data into a single default section so
-- forms created before this migration keep working.
update public.forms
set sections = jsonb_build_array(
  jsonb_build_object('id', 'main', 'columns', 1, 'fields', fields)
)
where sections = '[]' and jsonb_array_length(fields) > 0;

alter table public.forms drop column if exists fields;
