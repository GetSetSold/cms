-- Backfill form_name in share snapshots for old shares
-- Run in Supabase SQL editor

-- For shares linked to attachments: use the attachment's form_name
UPDATE form_shares s
SET snapshot = jsonb_set(
  s.snapshot,
  '{form_name}',
  to_jsonb(a.form_name)
)
FROM lead_form_attachments a
WHERE s.attachment_id = a.id
  AND (s.snapshot->>'form_name' IS NULL OR s.snapshot->>'form_name' = '');

-- For shares linked to main submissions: use the form name from forms table
UPDATE form_shares s
SET snapshot = jsonb_set(
  s.snapshot,
  '{form_name}',
  to_jsonb(COALESCE(f.name, l.form_key, 'Form'))
)
FROM leads l
LEFT JOIN forms f ON f.form_key = l.form_key
WHERE s.lead_id = l.id
  AND s.attachment_id IS NULL
  AND (s.snapshot->>'form_name' IS NULL OR s.snapshot->>'form_name' = '');

-- Verify
SELECT token, snapshot->>'form_name' AS form_name, created_at
FROM form_shares
ORDER BY created_at DESC
LIMIT 10;
