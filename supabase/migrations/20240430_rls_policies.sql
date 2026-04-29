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
