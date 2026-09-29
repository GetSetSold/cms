-- Lets staff switch email/SMS providers from Settings instead of needing a redeploy. Both provider
-- implementations stay in the code; this just says which one is active. Defaults match what's
-- already configured (ZeptoMail/Vonage) so nothing changes until someone picks something else.
alter table public.site_settings
  add column if not exists email_provider text not null default 'zeptomail',
  add column if not exists sms_provider text not null default 'vonage';

alter table public.site_settings
  add constraint email_provider_check check (email_provider in ('zeptomail', 'resend')),
  add constraint sms_provider_check check (sms_provider in ('vonage', 'twilio'));
