-- Migration: Add parent_id to folders for nested structure
ALTER TABLE public.folders ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON public.folders(parent_id);

COMMENT ON COLUMN public.folders.parent_id IS 'Reference to the parent folder for nested structures.';
