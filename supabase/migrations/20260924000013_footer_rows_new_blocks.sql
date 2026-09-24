-- Footer: replace the single auto-wrapping column list with explicit rows —
-- editors now add a new row on purpose ("+ Add row") instead of relying on
-- CSS to reflow, which broke visually once column count didn't match
-- columns_per_row (the brand block's wider track threw off the wrap).
update public.site_settings
set footer = (footer - 'columns') || jsonb_build_object(
  'rows',
  case when jsonb_array_length(coalesce(footer->'columns', '[]'::jsonb)) > 0
       then jsonb_build_array(footer->'columns')
       else '[]'::jsonb
  end
)
where id = 1 and not (footer ? 'rows');

-- Three new reusable blocks:
--   icon_card      — one icon + title + content + link. Meant to be placed
--                     2-4 up in a builder "row group" for a custom feature grid.
--   process_steps  — numbered 1,2,3… steps, add as many as needed.
--   checklist      — a simple check-marked list, add as many items as needed.
insert into public.block_types (key, name, category, default_data) values
('icon_card',     'Icon card',      'content', '{"svg_id":null,"heading":"[Title]","text":"[Short description]","link":{"label":"","href":""}}'),
('process_steps', 'Process steps',  'content', '{"heading":"How it works","items":[{"title":"[Step one]","text":"[Short description]"},{"title":"[Step two]","text":"[Short description]"},{"title":"[Step three]","text":"[Short description]"}]}'),
('checklist',     'Checklist',      'content', '{"heading":"","items":[{"text":"[Item one]"},{"text":"[Item two]"}]}');
