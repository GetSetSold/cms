-- Referral link generator block (Block 3 of /refer)
INSERT INTO block_types (key, name, category, is_active, default_data)
VALUES (
  'referral_link',
  'Referral Link Generator',
  'Forms',
  true,
  '{"heading": "Get your referral link", "description": "Enter your name and email. Your personal link is generated instantly — share it with anyone, as many times as you like.", "promise_text": "Our promise: we''ll reach out once, mention your name, and never spam them.", "success_message": "Thanks! We''ll reach out with personalized, no-pressure guidance."}'::jsonb
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  is_active = true;
