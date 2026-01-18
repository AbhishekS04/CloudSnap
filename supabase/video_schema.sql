-- Clean, idempotent schema update for video support
-- Run this entire file in the Supabase SQL Editor

-- 1. Add Video Metadata Columns
ALTER TABLE images ADD COLUMN IF NOT EXISTS duration DECIMAL(10, 2);
ALTER TABLE images ADD COLUMN IF NOT EXISTS bitrate INTEGER;
ALTER TABLE images ADD COLUMN IF NOT EXISTS original_url TEXT;
ALTER TABLE images ADD COLUMN IF NOT EXISTS original_ext TEXT;
ALTER TABLE images ADD COLUMN IF NOT EXISTS optimized_format TEXT;
ALTER TABLE images ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id);

-- 2. Add URL Columns for different sizes/variants
ALTER TABLE images ADD COLUMN IF NOT EXISTS thumb_url TEXT;
ALTER TABLE images ADD COLUMN IF NOT EXISTS sm_url TEXT;
ALTER TABLE images ADD COLUMN IF NOT EXISTS md_url TEXT;
ALTER TABLE images ADD COLUMN IF NOT EXISTS lg_url TEXT;

-- 3. (Optional) Create a specific index for folder_id if you use folders often
CREATE INDEX IF NOT EXISTS idx_images_folder_id ON images(folder_id);

-- 4. Comment on columns for clarity (Optional)
COMMENT ON COLUMN images.original_url IS 'Direct URL to the original uploaded file';
COMMENT ON COLUMN images.duration IS 'Video duration in seconds';
