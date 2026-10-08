-- Add Divider block type
INSERT INTO block_types (key, name, category, is_active, default_data)
VALUES (
  'divider',
  'Divider',
  'Layout',
  true,
  '{"color": "#e5e5e5", "thickness": 1, "width": "100%", "spacing": 24}'::jsonb
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  is_active = true;
