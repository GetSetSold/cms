insert into public.block_types (key, name, category, default_data) values
('faq_boxed', 'FAQ (boxed cards)', 'content', '{"heading":"Frequently Asked Questions","items":[{"q":"[What should visitors know first?]","a":"[A clear, complete answer.]"},{"q":"[Second question]","a":"[Answer]"},{"q":"[Third question]","a":"[Answer]"}]}');

insert into public.section_presets (name, category, description, sort_order, blocks) values
('FAQ — boxed cards', 'FAQ', 'Each question its own card, first one open, +/- to expand the rest.', 3, '[
  {"type":"faq_boxed","data":{"heading":"Frequently Asked Questions","items":[
    {"q":"[What should I expect first?]","a":"[Answer.]"},
    {"q":"[Second question]","a":"[Answer.]"},
    {"q":"[Third question]","a":"[Answer.]"},
    {"q":"[Fourth question]","a":"[Answer.]"}
  ]}}
]');
