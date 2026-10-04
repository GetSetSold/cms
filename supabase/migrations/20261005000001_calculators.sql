-- Calculator regulatory/default settings (Admin → Calculators).
-- Merged over in-code defaults, so an empty object works from day one.
ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS calculators JSONB NOT NULL DEFAULT '{}';
