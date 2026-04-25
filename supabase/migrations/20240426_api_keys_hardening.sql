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
