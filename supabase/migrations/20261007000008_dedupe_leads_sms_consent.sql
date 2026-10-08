-- Deduplicate leads by email and phone, then set SMS consent for all with phones.
-- Run in Supabase SQL editor (atmrjimfcydgjonlxzvr).
-- Keeps the OLDEST lead in each duplicate group; moves all child records over.

-- Step 1: Deduplicate by email (case-insensitive)
DO $$
DECLARE
  grp RECORD;
  keep_id UUID;
  dup_id UUID;
BEGIN
  FOR grp IN
    SELECT lower(email) AS em, array_agg(id ORDER BY created_at) AS ids, count(*) AS c
    FROM leads WHERE email IS NOT NULL AND email <> ''
    GROUP BY lower(email) HAVING count(*) > 1
  LOOP
    keep_id := grp.ids[1];
    FOR i IN 2..grp.c LOOP
      dup_id := grp.ids[i];
      -- Move child records
      UPDATE lead_form_attachments SET lead_id = keep_id WHERE lead_id = dup_id;
      UPDATE lead_activities SET lead_id = keep_id WHERE lead_id = dup_id;
      UPDATE lead_flow_enrollments SET lead_id = keep_id WHERE lead_id = dup_id;
      UPDATE follow_up_queue SET lead_id = keep_id WHERE lead_id = dup_id;
      UPDATE opportunities SET lead_id = keep_id WHERE lead_id = dup_id;
      UPDATE form_shares SET lead_id = keep_id WHERE lead_id = dup_id;
      -- Fill in missing contact fields on the kept record
      UPDATE leads k SET
        first_name = COALESCE(k.first_name, d.first_name),
        last_name = COALESCE(k.last_name, d.last_name),
        phone = COALESCE(k.phone, d.phone),
        custom_fields = COALESCE(k.custom_fields, '{}'::jsonb) || COALESCE(d.custom_fields, '{}'::jsonb)
      FROM leads d WHERE k.id = keep_id AND d.id = dup_id;
      -- Delete the duplicate
      DELETE FROM leads WHERE id = dup_id;
      RAISE NOTICE 'Merged duplicate % into % (email %)', dup_id, keep_id, grp.em;
    END LOOP;
  END LOOP;
END $$;

-- Step 2: Deduplicate by phone (for leads with no email match)
DO $$
DECLARE
  grp RECORD;
  keep_id UUID;
  dup_id UUID;
BEGIN
  FOR grp IN
    SELECT phone AS ph, array_agg(id ORDER BY created_at) AS ids, count(*) AS c
    FROM leads WHERE phone IS NOT NULL AND phone <> ''
    GROUP BY phone HAVING count(*) > 1
  LOOP
    keep_id := grp.ids[1];
    FOR i IN 2..grp.c LOOP
      dup_id := grp.ids[i];
      UPDATE lead_form_attachments SET lead_id = keep_id WHERE lead_id = dup_id;
      UPDATE lead_activities SET lead_id = keep_id WHERE lead_id = dup_id;
      UPDATE lead_flow_enrollments SET lead_id = keep_id WHERE lead_id = dup_id;
      UPDATE follow_up_queue SET lead_id = keep_id WHERE lead_id = dup_id;
      UPDATE opportunities SET lead_id = keep_id WHERE lead_id = dup_id;
      UPDATE form_shares SET lead_id = keep_id WHERE lead_id = dup_id;
      UPDATE leads k SET
        first_name = COALESCE(k.first_name, d.first_name),
        last_name = COALESCE(k.last_name, d.last_name),
        email = COALESCE(k.email, d.email),
        custom_fields = COALESCE(k.custom_fields, '{}'::jsonb) || COALESCE(d.custom_fields, '{}'::jsonb)
      FROM leads d WHERE k.id = keep_id AND d.id = dup_id;
      DELETE FROM leads WHERE id = dup_id;
      RAISE NOTICE 'Merged duplicate % into % (phone %)', dup_id, keep_id, grp.ph;
    END LOOP;
  END LOOP;
END $$;

-- Step 3: Set SMS consent for all leads with a phone number
UPDATE leads SET sms_opt_in = true WHERE phone IS NOT NULL AND phone <> '' AND sms_opt_in IS NOT TRUE;

-- Verify
SELECT count(*) AS total_leads FROM leads;
SELECT count(*) AS with_sms_consent FROM leads WHERE sms_opt_in = true;
