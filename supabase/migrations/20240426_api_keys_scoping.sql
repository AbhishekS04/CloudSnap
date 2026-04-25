-- Add folder_id to api_keys table for scoping
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS folder_id TEXT;

-- Optional: Link it to the folders table if you want strict foreign keys
-- ALTER TABLE public.api_keys ADD CONSTRAINT fk_folder FOREIGN KEY (folder_id) REFERENCES public.folders(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.api_keys.folder_id IS 'If set, this key can ONLY upload to this specific folder.';
