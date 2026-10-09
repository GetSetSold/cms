-- Add focus_keyword to pages for SEO auto-optimization
ALTER TABLE pages ADD COLUMN IF NOT EXISTS focus_keyword TEXT;
