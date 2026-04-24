-- CloudSnap: Complete Database Schema
-- Single file — run this in Supabase SQL Editor
-- Order matters: folders → images → assets

-- ============================================================
-- 1. STORAGE BUCKET
-- ============================================================

insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do update set public = true;

-- ============================================================
-- 2. FOLDERS TABLE
-- ============================================================

create table if not exists public.folders (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  parent_id  uuid references public.folders(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.folders enable row level security;

create index if not exists idx_folders_parent on public.folders(parent_id);

drop policy if exists "Public Read Folders" on public.folders;
create policy "Public Read Folders" on public.folders for select using (true);

drop policy if exists "Service Insert Folders" on public.folders;
create policy "Service Insert Folders" on public.folders for insert to service_role with check (true);

drop policy if exists "Service Update Folders" on public.folders;
create policy "Service Update Folders" on public.folders for update to service_role using (true);

drop policy if exists "Service Delete Folders" on public.folders;
create policy "Service Delete Folders" on public.folders for delete to service_role using (true);

-- ============================================================
-- 3. IMAGES TABLE (legacy — kept for existing data)
-- ============================================================

create table if not exists public.images (
  id               uuid primary key default gen_random_uuid(),
  original_name    text not null,
  original_ext     text not null,
  mime_type        text not null,
  width            int  not null default 0,
  height           int  not null default 0,
  original_size    int  not null default 0,
  optimized_format text default 'webp',
  duration         decimal(10,2),
  bitrate          integer,
  original_url     text,
  thumb_url        text,
  sm_url           text,
  md_url           text,
  lg_url           text,
  thumb_size       int,
  sm_size          int,
  md_size          int,
  lg_size          int,
  folder_id        uuid references public.folders(id) on delete set null,
  created_at       timestamptz not null default now()
);

alter table public.images enable row level security;

create index if not exists idx_images_folder_id on public.images(folder_id);

drop policy if exists "Public Access" on storage.objects;
create policy "Public Access" on storage.objects for select using (bucket_id = 'assets');

drop policy if exists "Authenticated Insert" on storage.objects;
create policy "Authenticated Insert" on storage.objects for insert to authenticated with check (bucket_id = 'assets');

drop policy if exists "Authenticated Update" on storage.objects;
create policy "Authenticated Update" on storage.objects for update to authenticated using (bucket_id = 'assets');

drop policy if exists "Authenticated Delete" on storage.objects;
create policy "Authenticated Delete" on storage.objects for delete to authenticated using (bucket_id = 'assets');

-- ============================================================
-- 4. ASSETS TABLE (new — Telegram-backed storage)
-- ============================================================

create table if not exists public.assets (
  id                  uuid primary key default gen_random_uuid(),
  original_name       text    not null,
  mime_type           text    not null,
  width               int,
  height              int,
  duration            decimal(10,2),
  original_size       bigint  not null default 0,
  telegram_file_ids   text[]  not null default '{}',
  telegram_chat_id    text    not null default '',
  is_chunked          boolean not null default false,
  chunk_count         int     not null default 1,
  folder_id           uuid references public.folders(id) on delete set null,
  created_at          timestamptz not null default now()
);

alter table public.assets enable row level security;

create index if not exists idx_assets_folder_id  on public.assets(folder_id);
create index if not exists idx_assets_created_at on public.assets(created_at desc);
create index if not exists idx_assets_mime_type  on public.assets(mime_type);

drop policy if exists "Public Read Assets" on public.assets;
create policy "Public Read Assets" on public.assets for select using (true);

drop policy if exists "Service Insert Assets" on public.assets;
create policy "Service Insert Assets" on public.assets for insert to service_role with check (true);

drop policy if exists "Service Update Assets" on public.assets;
create policy "Service Update Assets" on public.assets for update to service_role using (true);

drop policy if exists "Service Delete Assets" on public.assets;
create policy "Service Delete Assets" on public.assets for delete to service_role using (true);

-- Done!
