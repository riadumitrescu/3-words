-- Add match_score and analysis columns to words table

-- Add match_score column (numeric to store percentage values)
ALTER TABLE IF EXISTS public.words
ADD COLUMN match_score numeric;

-- Add analysis column (text to store the Gemini analysis text)
ALTER TABLE IF EXISTS public.words
ADD COLUMN analysis text;

-- Update existing entries with default values if needed
-- UPDATE public.words
-- SET match_score = 0,
--     analysis = 'No analysis available'
-- WHERE match_score IS NULL
-- AND analysis IS NULL;

-- This command will show the updated table structure
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'words'; 