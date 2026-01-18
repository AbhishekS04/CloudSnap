-- Enable the pg_net extension to allow Supabase to make HTTP requests (optional, but often useful)
-- create extension if not exists "pg_net";

-- 1. Create a storage bucket for assets
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do nothing;

-- 2. Allow public access to the assets bucket
-- Note: You might need to drop the policy first if it exists and you're re-running this
drop policy if exists "Public Access" on storage.objects;
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'assets' );

-- 3. Create images metadata table
create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  original_name text not null,
  original_ext text not null,
  mime_type text not null,
  width int not null,
  height int not null,
  original_size int not null,
  optimized_format text default 'webp',
  
  -- Public URLs
  thumb_url text,
  sm_url text,
  md_url text,
  lg_url text,
  
  -- File sizes in bytes
  thumb_size int,
  sm_size int,
  md_size int,
  lg_size int,
  
  created_at timestamp with time zone default now()
);

-- 4. Enable RLS (Row Level Security)
alter table public.images enable row level security;

-- 5. Create Policy for Reading Images (Optional: if you want the Table to be public too)
-- Since this is a private dashboard, you might want to restrict this.
-- However, if you want your portfolio to query the DB (e.g. valid dynamic gallery), allow public read.
-- User requirement: "Get a public URL that I can paste into my portfolio".
-- Usually this means the Storage URL. The table is for the Dashboard.
-- We will enable RLS but since we use Service Role Key in the API, we bypass it for Admin operations.
-- We can add a policy for authenticated users if needed later.

-- 6. Create Folders table
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references public.folders(id),
  created_at timestamp with time zone default now()
);

-- 7. Add folder support to images
alter table public.images 
add column if not exists folder_id uuid references public.folders(id);

-- 8. Enable RLS for folders
alter table public.folders enable row level security;

