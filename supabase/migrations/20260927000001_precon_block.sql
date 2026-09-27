insert into public.block_types (key, name, category, default_data) values
('precon_projects_grid', 'Pre-Construction Projects (filterable grid)', 'content', '{"heading":"All Pre-Construction Projects","show_filters":true,"show_stats":true,"show_map":true}')
on conflict (key) do nothing;
