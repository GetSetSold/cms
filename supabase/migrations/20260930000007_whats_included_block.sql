insert into public.block_types (key, name, category, default_data) values
('whats_included', 'What''s included (service matrix with status pills)', 'content',
 '{"eyebrow":"EVERYTHING YOU NEED TO SELL YOUR HOME","heading":"Every detail, included.","subline":"No shortcuts — just strategic, results-driven support.","mobile_columns":"2","items":[{"title":"Free Professional Cleaning","text":"Start your home sale with a spotless impression."}]}')
on conflict (key) do nothing;
