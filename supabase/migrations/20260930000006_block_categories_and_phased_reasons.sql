-- Two things: (1) real categories for the block picker — almost every block was previously dumped
-- into one generic "content" bucket, which is why the "Blank blocks" list felt long and flat even
-- though the Presets tab (grouped correctly) didn't. (2) registers the new "Phases & reasons" block.

update public.block_types set category = 'hero' where key = 'hero';

update public.block_types set category = 'content'
  where key in ('rich_text', 'text_svg', 'section_header', 'feature_section', 'icon_card', 'features', 'spacer');

update public.block_types set category = 'social-proof'
  where key in ('logos', 'stats', 'testimonials', 'team_profile');

update public.block_types set category = 'faq'
  where key in ('faq', 'faq_boxed', 'qa_block');

update public.block_types set category = 'process-steps'
  where key in ('process_steps', 'timeline', 'checklist', 'service_areas');

update public.block_types set category = 'listings'
  where key in ('listing_grid', 'featured_listing', 'featured_listings_grid', 'sold_history_grid', 'precon_projects_grid');

update public.block_types set category = 'forms-conversion'
  where key in ('custom_form', 'lead_form', 'contact_info', 'cta', 'pricing');

update public.block_types set category = 'blog-links'
  where key in ('blog_grid', 'social_links', 'custom_code');

insert into public.block_types (key, name, category, default_data) values
('phased_reasons', 'Phases & reasons (numbered, grouped by phase)', 'process-steps',
 '{"eyebrow":"20 REASONS TO CHOOSE US","heading":"Every detail, open and easy to scan.","subline":"A complete plan, from your first consultation through closing.","phases":[{"label":"PHASE 1 · 2 REASONS","title":"Getting started","description":"Strategy first.","reasons":[{"title":"Reason one","text":"Description of the first reason."},{"title":"Reason two","text":"Description of the second reason."}]}]}')
on conflict (key) do nothing;
