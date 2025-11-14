-- Up Migration

-- Add decomposition column to stories table to store story decomposition results
ALTER TABLE public.stories
ADD COLUMN decomposition jsonb;

COMMENT ON COLUMN public.stories.decomposition IS 'Structured decomposition result containing steps (given preconditions and requirements with assertions)';

-- Down Migration

-- Remove decomposition column
ALTER TABLE public.stories
DROP COLUMN IF EXISTS decomposition;
