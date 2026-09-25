insert into public.block_types (key, name, category, default_data) values
('qa_block', 'Q&A (AI-citation friendly)', 'content', '{"heading":"Common questions","items":[{"q":"[Question, phrased the way someone would actually ask it]","a":"[Direct answer first, then a short supporting detail if needed]"},{"q":"[Second question]","a":"[Direct answer]"}]}');

insert into public.section_presets (name, category, description, sort_order, blocks) values
('Q&A (answers visible, not collapsed)', 'FAQ', 'Question-and-answer pairs shown in full, not hidden behind a click — the format AI answer engines cite most.', 2, '[
  {"type":"qa_block","data":{"heading":"Common questions","items":[
    {"q":"[Question one, phrased naturally]","a":"[Direct answer in the first sentence, then one short supporting fact.]"},
    {"q":"[Question two]","a":"[Direct answer.]"},
    {"q":"[Question three]","a":"[Direct answer.]"}
  ]}}
]');
