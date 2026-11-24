-- Savings calculator block (1% Seller Success Program lead tool).
-- Run in the CMS/CRM project (pcgggfqndoaoddcrechr).
INSERT INTO block_types (key, name, category, is_active, default_data)
VALUES (
  'savings_calculator',
  'Savings Calculator (1% Listing)',
  'Forms',
  true,
  '{"heading": "See how much you save selling with Get Set Sold", "description": "Slide to your home''s price — most sellers pay 5% commission. We list for 1%.", "button_label": "Get my exact savings + free home valuation", "success_message": "Thanks — your savings breakdown is on its way, and Rohit will follow up with your free home valuation."}'::jsonb
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  is_active = true;
