-- Add brokerage settings column to site_settings (footer Brokerage block).
ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS brokerage JSONB NOT NULL DEFAULT '{}';
