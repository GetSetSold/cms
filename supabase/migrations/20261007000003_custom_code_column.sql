-- Sitewide custom code (chat widgets, pixels, etc.): injected on every page
-- from Admin → Settings → Custom code.
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS custom_code TEXT NOT NULL DEFAULT '';
