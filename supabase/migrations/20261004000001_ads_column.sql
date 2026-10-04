-- AdSense grid ads: ads config column on site_settings
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS ads JSONB NOT NULL DEFAULT '{}';
