insert into public.block_types (key, name, category, default_data) values
('section_header', 'Section header', 'content', '{"eyebrow":"[For example: For Home Sellers]","heading":"[A bold section heading]","subline":"[A short bold supporting line]","align":"left"}');

insert into public.section_presets (name, category, description, sort_order, blocks) values
('Eyebrow + heading + divider', 'Trust', 'Colored eyebrow, bold heading, a divider rule, and a bold subline — good above any section.', 4, '[
  {"type":"section_header","data":{"eyebrow":"[For Example: For Home Sellers]","heading":"[Making Your Section Seamless And Clear]","subline":"[A short bold supporting line, e.g. terms or a guarantee.]"}}
]');
