-- Brings the two hand-coded forms (the Page Builder's "Lead Form" block, and the hardcoded listing
-- inquiry card) into the real Forms system, so both are finally editable without a code change.
-- General Contact keeps a single "Name" field (matching what's live today); Listing Inquiry uses the
-- First/Last split, which is the standard going forward, and has no Phone, per instruction.

insert into public.forms (name, slug, description, sections, submit_label, success_message, form_key, is_active)
values (
  'General Contact',
  'general-contact',
  'The site-wide contact form (previously the Page Builder''s "Lead Form" block).',
  jsonb_build_array(jsonb_build_object(
    'id', 'main', 'columns', 2,
    'fields', jsonb_build_array(
      jsonb_build_object('key', 'name', 'label', 'Name', 'type', 'text', 'required', true, 'span', 1),
      jsonb_build_object('key', 'phone', 'label', 'Phone', 'type', 'tel', 'required', false, 'span', 1),
      jsonb_build_object('key', 'email', 'label', 'Email', 'type', 'email', 'required', true, 'span', 2),
      jsonb_build_object('key', 'message', 'label', 'How can we help?', 'type', 'textarea', 'required', false, 'span', 2),
      jsonb_build_object('key', 'sms_opt_in', 'label', 'I agree to receive text messages from Rohit Sharma about my request. Message & data rates may apply. Reply STOP to opt out.', 'type', 'checkbox', 'required', false, 'span', 2)
    )
  )),
  'Send', 'Thanks — we''ll be in touch shortly.', 'contact', true
)
on conflict (slug) do nothing;

insert into public.forms (name, slug, description, sections, submit_label, success_message, form_key, is_active)
values (
  'Listing Inquiry',
  'listing-inquiry',
  'The "Request info" card on a listing/pre-construction page (previously ListingContactCard).',
  jsonb_build_array(jsonb_build_object(
    'id', 'main', 'columns', 1,
    'fields', jsonb_build_array(
      jsonb_build_object('key', 'first_name', 'label', 'First name', 'type', 'text', 'required', true),
      jsonb_build_object('key', 'last_name', 'label', 'Last name', 'type', 'text', 'required', true),
      jsonb_build_object('key', 'email', 'label', 'Email', 'type', 'email', 'required', true),
      jsonb_build_object('key', 'message', 'label', 'Message', 'type', 'textarea', 'required', false),
      jsonb_build_object('key', 'sms_opt_in', 'label', 'I agree to receive email and text messages from Realtor Rohit Sharma about my request. Message & data rates may apply. Reply STOP to opt out.', 'type', 'checkbox', 'required', false)
    )
  )),
  'Request info', 'Thanks — we''ll be in touch shortly.', 'listing_inquiry', true
)
on conflict (slug) do nothing;
