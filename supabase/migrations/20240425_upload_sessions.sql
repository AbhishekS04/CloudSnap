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
