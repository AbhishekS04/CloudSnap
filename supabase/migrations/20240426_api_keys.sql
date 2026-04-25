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
