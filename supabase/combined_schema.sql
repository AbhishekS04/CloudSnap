-- ============================================================
-- CloudSnap — Upload Sessions Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Table to track resumable chunk upload sessions
create table if not exists upload_sessions (
  id                   uuid primary key default gen_random_uuid(),
  file_name            text        not null,
  file_size            bigint      not null,
  mime_type            text        not null,
  folder_id            text,
  total_chunks         int         not null,
  confirmed_chunk_ids  text[]      not null default '{}',
  status               text        not null default 'in_progress',  -- in_progress | complete | failed
  created_at           timestamptz not null default now(),
  expires_at           timestamptz not null default now() + interval '24 hours'
);

-- RLS: only authenticated admin service role can access
alter table upload_sessions enable row level security;

-- Service role (used by supabaseAdmin) bypasses RLS automatically.
-- No explicit policy needed for server-side usage.

-- Index for fast session lookups by ID (already covered by primary key)
-- Index for cleanup queries by expiry
create index if not exists upload_sessions_expires_at_idx
  on upload_sessions (expires_at);

-- ============================================================
-- RPC: append_chunk_id
-- Atomically appends a Telegram file_id to confirmed_chunk_ids[].
-- Called by the chunk upload route after each successful Telegram upload.
-- Using array_append ensures no race condition between concurrent chunk uploads.
-- ============================================================

create or replace function append_chunk_id(
  p_session_id uuid,
  p_file_id    text
)
returns void
language sql
security definer
as $$
  update upload_sessions
  set confirmed_chunk_ids = array_append(confirmed_chunk_ids, p_file_id)
  where id = p_session_id
    and status = 'in_progress'
    and expires_at > now();
$$;

-- ============================================================
-- Optional: Cleanup job for expired sessions
-- If you have Supabase Edge Functions / pg_cron, schedule this.
-- Otherwise, expired sessions are caught at read-time in the API.
-- ============================================================

-- delete from upload_sessions where expires_at < now();


-- Create the api_keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_value TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE,
    user_id TEXT NOT NULL, -- The Clerk User ID
    is_active BOOLEAN DEFAULT true NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Allow the Service Role (Admin) to manage these keys
-- Since CloudSnap uses supabaseAdmin (service_role) for these operations,
-- we just need to ensure the service role has access.
CREATE POLICY "Admin full access" ON public.api_keys FOR ALL USING (true);

-- Optional: Add an index on key_value for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_value ON public.api_keys(key_value);


-- Tighten security on api_keys table
-- The previous policy was too permissive (FOR ALL USING (true))
DROP POLICY IF EXISTS "Admin full access" ON public.api_keys;

-- In Supabase, the service_role (used by supabaseAdmin) bypasses RLS automatically.
-- By not having any policies, we ensure that ONLY the service_role can access this table.
-- 'anon' and 'authenticated' roles will be blocked by RLS by default.

-- Optional: If you want to allow authenticated users (like yourself) to see them in the Supabase UI 
-- without using the service_role, you could add a specific policy, but it's safer to rely on the service_role.

-- Verify RLS is enabled
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;


-- Add folder_id to api_keys table for scoping
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS folder_id TEXT;

-- Optional: Link it to the folders table if you want strict foreign keys
-- ALTER TABLE public.api_keys ADD CONSTRAINT fk_folder FOREIGN KEY (folder_id) REFERENCES public.folders(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.api_keys.folder_id IS 'If set, this key can ONLY upload to this specific folder.';


-- Migration: Add telegram_message_ids to assets table for synchronized deletion
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS telegram_message_ids JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.assets.telegram_message_ids IS 'Array of Telegram message IDs for the uploaded file/chunks. Used for physical deletion.';


-- Migration: Add user_id to assets table for demo ownership tracking
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON public.assets(user_id);

COMMENT ON COLUMN public.assets.user_id IS 'Owner of the asset (Clerk User ID). Used for tracking demo limits.';


-- Migration: Add parent_id to folders for nested structure
ALTER TABLE public.folders ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON public.folders(parent_id);

COMMENT ON COLUMN public.folders.parent_id IS 'Reference to the parent folder for nested structures.';


-- Migration: Add AI Metadata Columns to Assets table
-- Date: 2024-04-30
-- Description: Adds ai_description for SEO Alt Text and ai_tags for smart categorization.

ALTER TABLE assets ADD COLUMN IF NOT EXISTS ai_description TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS ai_tags TEXT[];

-- Optional: Index for tag searching if you want to implement tag-based filtering later
-- CREATE INDEX IF NOT EXISTS idx_assets_ai_tags ON assets USING GIN (ai_tags);


-- Migration: Enable RLS and Create User Isolation Policies
-- Date: 2024-04-30
-- Description: Hardens the database by ensuring users can only interact with their own assets.

-- 1. Enable Row Level Security
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- 2. Create Policy: Users can only see their own assets
CREATE POLICY "Users can view own assets" 
ON assets FOR SELECT 
TO authenticated 
USING (auth.uid()::text = user_id);

-- 3. Create Policy: Users can only insert their own assets
CREATE POLICY "Users can insert own assets" 
ON assets FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid()::text = user_id);

-- 4. Create Policy: Users can only update their own assets
CREATE POLICY "Users can update own assets" 
ON assets FOR UPDATE 
TO authenticated 
USING (auth.uid()::text = user_id);

-- 5. Create Policy: Users can only delete their own assets
CREATE POLICY "Users can delete own assets" 
ON assets FOR DELETE 
TO authenticated 
USING (auth.uid()::text = user_id);

-- Note: Admin roles bypass RLS via the service_role key used in our server-side API routes.


CREATE INDEX IF NOT EXISTS idx_assets_original_name ON public.assets (original_name);
