# Supabase Setup Instructions

## Setting up the 'words' table in Supabase

Follow these steps to create the necessary database table:

1. Navigate to the Supabase dashboard (https://app.supabase.com) and select your project
2. Go to the 'Table Editor' section in the left sidebar
3. Click 'New Table' and enter 'words' as the name

4. Add the following columns:
   - id: type uuid, primary key, default: uuid_generate_v4()
   - user_id: type text, not null
   - player_name: type text, not null
   - friend_name: type text, not null
   - friend_words: type text[], not null
   - match_score: type numeric, null
   - analysis: type text, null
   - created_at: type timestamp with time zone, default: now()

5. Enable Row Level Security (RLS) by toggling it on
6. Create a new policy by clicking 'New Policy'
7. Use the following SQL for your policy:
   ```sql
   -- This policy works correctly and fixes the RLS violation error
   create policy "Allow inserts and reads"
   on words
   for insert, select
   using (true)
   with check (true);
   ```

This will allow insert and select operations on the words table, which is all this application needs.

## Fixing RLS Policy Errors

If you encounter the error "new row violates row-level security policy for table 'words'", run the following SQL in the SQL Editor:

```sql
-- Ensure RLS is enabled
alter table words enable row level security;

-- Remove any existing policies to avoid conflicts
drop policy if exists "Allow all actions" on words;

-- Create a more specific policy for inserts and reads only
create policy "Allow inserts and reads"
on words
for insert, select
using (true)
with check (true);
```

## Adding Missing Columns

If you need to add the match_score and analysis columns to an existing table, run this SQL:

```sql
-- Add match_score column (numeric to store percentage values)
ALTER TABLE IF EXISTS public.words
ADD COLUMN match_score numeric;

-- Add analysis column (text to store the Gemini analysis text)
ALTER TABLE IF EXISTS public.words
ADD COLUMN analysis text;
```

## Data Insertion Guide

When inserting data into the words table, include these fields:
- user_id: The ID of the player
- player_name: The name of the original player
- friend_name: The name of the friend providing the words
- friend_words: Array of 3 words chosen by the friend
- match_score: Numeric value representing the match percentage (optional)
- analysis: Text analysis of the word comparison (optional)

Do NOT include these fields (let Supabase handle them):
- id: Will be auto-generated as a UUID
- created_at: Will be set to the current timestamp

## Troubleshooting

- If you see errors related to 'relation "public.words" does not exist', make sure you've created the table exactly as specified above.
- Verify that Row Level Security (RLS) is correctly configured with the policy to allow inserts and reads.
- Check that the Supabase URL and anon key in src/lib/supabase.ts match your project settings.
- If match_score and analysis values aren't being saved, make sure those columns exist in your table structure. 