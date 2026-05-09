-- ============================================================
-- CloudSnap: Master Setup for Mumbai Region (EXACT CLONE)
-- Run this in your new Supabase SQL Editor
-- ============================================================

-- 0. STORAGE BUCKETS (Legacy Support)
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 1. FOLDERS TABLE
CREATE TABLE IF NOT EXISTS public.folders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  parent_id   UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. ASSETS TABLE (Telegram)
CREATE TABLE IF NOT EXISTS public.assets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             TEXT,
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
  ai_description      TEXT,
  ai_tags             TEXT[],
  lqip                TEXT
);

-- 3. IMAGES TABLE (Legacy, kept for perfect matching)
CREATE TABLE IF NOT EXISTS public.images (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_name    TEXT NOT NULL,
  original_ext     TEXT NOT NULL,
  mime_type        TEXT NOT NULL,
  width            INT  NOT NULL DEFAULT 0,
  height           INT  NOT NULL DEFAULT 0,
  original_size    INT  NOT NULL DEFAULT 0,
  optimized_format TEXT DEFAULT 'webp',
  duration         DECIMAL(10,2),
  bitrate          INTEGER,
  original_url     TEXT,
  thumb_url        TEXT,
  sm_url           TEXT,
  md_url           TEXT,
  lg_url           TEXT,
  thumb_size       INT,
  sm_size          INT,
  md_size          INT,
  lg_size          INT,
  folder_id        UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. API KEYS TABLE
CREATE TABLE IF NOT EXISTS public.api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_value    TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  user_id      TEXT NOT NULL,
  is_active    BOOLEAN DEFAULT true NOT NULL,
  folder_id    UUID REFERENCES public.folders(id) ON DELETE SET NULL
);

-- 5. UPLOAD SESSIONS TABLE (For chunked uploads)
CREATE TABLE IF NOT EXISTS public.upload_sessions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name            TEXT NOT NULL,
  file_size            BIGINT NOT NULL,
  mime_type            TEXT NOT NULL,
  folder_id            TEXT,
  total_chunks         INT NOT NULL,
  confirmed_chunk_ids  TEXT[] NOT NULL DEFAULT '{}',
  status               TEXT NOT NULL DEFAULT 'in_progress',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at           TIMESTAMPTZ NOT NULL DEFAULT now() + interval '24 hours'
);

-- 6. RPC FUNCTION FOR CHUNK UPLOADS
CREATE OR REPLACE FUNCTION append_chunk_id(
  p_session_id uuid,
  p_file_id    text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE upload_sessions
  SET confirmed_chunk_ids = array_append(confirmed_chunk_ids, p_file_id)
  WHERE id = p_session_id
    AND status = 'in_progress'
    AND expires_at > now();
$$;

-- 7. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON public.assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_folder_id ON public.assets(folder_id);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON public.assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_original_name ON public.assets (original_name);
CREATE INDEX IF NOT EXISTS upload_sessions_expires_at_idx ON upload_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_images_folder_id on public.images(folder_id);

-- 8. SECURITY (Row Level Security)
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_sessions ENABLE ROW LEVEL SECURITY;

-- Disable all policies and let the Service Role (API) handle security safely
DROP POLICY IF EXISTS "Users can view own assets" ON public.assets;
DROP POLICY IF EXISTS "Users can insert own assets" ON public.assets;
DROP POLICY IF EXISTS "Users can update own assets" ON public.assets;
DROP POLICY IF EXISTS "Users can delete own assets" ON public.assets;
