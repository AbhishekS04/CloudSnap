-- ============================================================
-- CloudSnap: Master System Setup SQL
-- ============================================================
-- Description: This file contains the ENTIRE database schema, including:
--  - Tables (Folders, Assets, API Keys)
--  - Security (Row Level Security & User Isolation Policies)
--  - Intelligence (AI Description & Tags)
--  - Storage (Bucket initialization)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. STORAGE INITIALIZATION
-- ─────────────────────────────────────────────────────────────

-- Ensure the assets bucket exists for legacy storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ─────────────────────────────────────────────────────────────
-- 2. CORE TABLES
-- ─────────────────────────────────────────────────────────────

-- 2a. Folders Table
CREATE TABLE IF NOT EXISTS public.folders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  parent_id   UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  user_id     TEXT, -- For Clerk User Isolation
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2b. Assets Table (Telegram-backed)
CREATE TABLE IF NOT EXISTS public.assets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             TEXT, -- For Clerk User Isolation
  original_name       TEXT NOT NULL,
  mime_type           TEXT NOT NULL,
  width               INT,
  height              INT,
  duration            DECIMAL(10,2),
  original_size       BIGINT NOT NULL DEFAULT 0,
  telegram_file_ids   TEXT[] NOT NULL DEFAULT '{}',
  telegram_message_ids INT[] NOT NULL DEFAULT '{}',
  telegram_chat_id    TEXT NOT NULL DEFAULT '',
  is_chunked          BOOLEAN NOT NULL DEFAULT false,
  chunk_count         INT NOT NULL DEFAULT 1,
  folder_id           UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- AI Metadata
  ai_description      TEXT,
  ai_tags             TEXT[]
);

-- 2c. API Keys Table (Developer Access)
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    key_name TEXT NOT NULL,
    hashed_key TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL,
    scopes TEXT[] DEFAULT '{ "read", "write" }',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

-- ─────────────────────────────────────────────────────────────
-- 3. INDEXING FOR PERFORMANCE
-- ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_assets_user_id ON public.assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_folder_id ON public.assets(folder_id);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON public.assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON public.folders(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hashed ON public.api_keys(hashed_key);

-- ─────────────────────────────────────────────────────────────
-- 4. SECURITY (RLS & POLICIES)
-- ─────────────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- 4a. Asset Policies (Clerk User Isolation)
DROP POLICY IF EXISTS "Users can view own assets" ON public.assets;
CREATE POLICY "Users can view own assets" ON public.assets FOR SELECT TO authenticated USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert own assets" ON public.assets;
CREATE POLICY "Users can insert own assets" ON public.assets FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own assets" ON public.assets;
CREATE POLICY "Users can update own assets" ON public.assets FOR UPDATE TO authenticated USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own assets" ON public.assets;
CREATE POLICY "Users can delete own assets" ON public.assets FOR DELETE TO authenticated USING (auth.uid()::text = user_id);

-- 4b. Folder Policies
DROP POLICY IF EXISTS "Users can manage own folders" ON public.folders;
CREATE POLICY "Users can manage own folders" ON public.folders FOR ALL TO authenticated USING (auth.uid()::text = user_id);

-- 4c. API Key Policies
DROP POLICY IF EXISTS "Users can manage own api keys" ON public.api_keys;
CREATE POLICY "Users can manage own api keys" ON public.api_keys FOR ALL TO authenticated USING (auth.uid()::text = user_id);

-- ─────────────────────────────────────────────────────────────
-- 5. REALTIME (REPLICATION)
-- ─────────────────────────────────────────────────────────────

-- Enable Realtime for assets and folders (must also be toggled in Supabase UI)
-- Note: You manually toggled these in the UI, but this SQL enables the underlying publication.
-- ALTER PUBLICATION supabase_realtime ADD TABLE assets;
-- ALTER PUBLICATION supabase_realtime ADD TABLE folders;

-- ============================================================
-- Setup Complete!
-- ============================================================
