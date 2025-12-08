-- Up Migration

-- Add git_author column to runs table to store commit author information
ALTER TABLE public.runs
ADD COLUMN git_author jsonb;

COMMENT ON COLUMN public.runs.git_author IS 'Git commit author information stored as JSON: {id, login, name}';

-- Down Migration

ALTER TABLE public.runs
DROP COLUMN IF EXISTS git_author;
