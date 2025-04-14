# Supabase RLS Policy Fix

To fix the 'new row violates row-level security policy for table "words"' error, you need to run the following SQL commands in your Supabase SQL Editor:

```sql
-- Make sure RLS is enabled
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

These commands will:
1. Ensure Row Level Security is enabled for the words table
2. Remove any existing policies that might conflict
3. Create a policy that allows only INSERT and SELECT operations (not UPDATE or DELETE)
4. The 'using (true)' part allows SELECT operations for all rows
5. The 'with check (true)' part allows INSERT operations for all rows

This approach is more secure than allowing all actions, as it restricts operations to only what's needed by the application.

When inserting data, remember to only include these fields:
- user_id
- friend_name
- friend_words

Let Supabase automatically generate:
- id (UUID)
- created_at (timestamp)

Once you've run these commands, the error should be resolved, and your app will be able to insert and read data from the words table. 