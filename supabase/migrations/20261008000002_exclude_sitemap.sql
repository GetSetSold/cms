-- Add exclude_from_sitemap to pages
ALTER TABLE pages ADD COLUMN IF NOT EXISTS exclude_from_sitemap BOOLEAN DEFAULT FALSE;
