insert into public.block_types (key, name, category, default_data) values
('social_links', 'Social links', 'content', '{"heading":"","size":"md","items":[]}');

update public.site_settings
set footer = footer || jsonb_build_object('mobile_columns_per_row', 1)
where id = 1 and not (footer ? 'mobile_columns_per_row');
