-- RLS Policy Fix for the 'words' table
-- Run this in your Supabase SQL Editor

-- Make sure RLS is enabled
ALTER TABLE words ENABLE ROW LEVEL SECURITY;

-- Remove any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow all actions" ON words;
DROP POLICY IF EXISTS "Allow inserts and reads" ON words;
DROP POLICY IF EXISTS "public_words_policy" ON words;
DROP POLICY IF EXISTS "unrestricted_words_access" ON words;
DROP POLICY IF EXISTS "enable_all_access_policy" ON words;
DROP POLICY IF EXISTS "allow_everything" ON words;

-- Create a new policy specifically for inserts and reads
CREATE POLICY "Allow inserts and reads"
ON words
FOR INSERT, SELECT
USING (true)
WITH CHECK (true);

-- Verify the policy was created
SELECT * FROM pg_policies WHERE tablename = 'words'; 