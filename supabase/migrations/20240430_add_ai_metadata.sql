-- Migration: Add AI Metadata Columns to Assets table
-- Date: 2024-04-30
-- Description: Adds ai_description for SEO Alt Text and ai_tags for smart categorization.

ALTER TABLE assets ADD COLUMN IF NOT EXISTS ai_description TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS ai_tags TEXT[];

-- Optional: Index for tag searching if you want to implement tag-based filtering later
-- CREATE INDEX IF NOT EXISTS idx_assets_ai_tags ON assets USING GIN (ai_tags);
