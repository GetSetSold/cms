-- icon_card now has an explicit "box" option (background panel), contained
-- within its own column and set to h-full so a boxed row of cards stretches
-- evenly together. Previously the only way to get a background was the
-- generic per-block section setting, which could end up applied to just one
-- card in a row — exactly the mismatched look this migration fixes.

update public.block_types
set default_data = default_data || '{"box": false}'::jsonb
where key = 'icon_card';

-- Make every card in the existing feature presets boxed, uniformly, so a
-- freshly-inserted row never has the one-boxed-two-plain mismatch.
update public.section_presets
set blocks = (
  select jsonb_agg(
    case when b->>'type' = 'icon_card'
      then jsonb_set(b, '{data,box}', 'true'::jsonb)
      else b
    end
  )
  from jsonb_array_elements(blocks) b
)
where name in ('3-column icon features', '4-column icon features', '2-column benefit cards');
