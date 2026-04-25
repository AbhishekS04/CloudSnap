-- Migration: Add user_id to assets table for demo ownership tracking
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON public.assets(user_id);

COMMENT ON COLUMN public.assets.user_id IS 'Owner of the asset (Clerk User ID). Used for tracking demo limits.';
