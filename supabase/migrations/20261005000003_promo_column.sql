-- Promo banners config column on site_settings
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS promo JSONB NOT NULL DEFAULT '{}';
