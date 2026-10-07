-- Home evaluation page settings (Admin -> Settings -> Home evaluation)
ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS home_evaluation JSONB NOT NULL DEFAULT '{}';
