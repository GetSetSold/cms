-- Agent contact card: agent info column on site_settings
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS agent JSONB NOT NULL DEFAULT '{}';
