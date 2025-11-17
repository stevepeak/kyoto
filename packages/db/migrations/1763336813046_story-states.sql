-- Up Migration

-- Create enum type for story states
CREATE TYPE public.story_state AS ENUM (
    'active',
    'generated',
    'paused',
    'archived',
    'planned',
    'processing'
);

-- Add state column with default 'active'
ALTER TABLE public.stories
ADD COLUMN state public.story_state NOT NULL DEFAULT 'active';

-- Add metadata column (jsonb, nullable)
ALTER TABLE public.stories
ADD COLUMN metadata jsonb;

-- Migrate existing data: archived = true -> state = 'archived', archived = false -> state = 'active'
UPDATE public.stories
SET state = CASE
    WHEN archived = true THEN 'archived'::public.story_state
    ELSE 'active'::public.story_state
END;

-- Drop the old index on archived
DROP INDEX IF EXISTS public.stories_repo_id_archived_idx;

-- Create new index on state for efficient filtering
CREATE INDEX IF NOT EXISTS stories_repo_id_state_idx ON public.stories(repo_id, state) WHERE state = 'active';

-- Add comment to explain the state column
COMMENT ON COLUMN public.stories.state IS 'The current state of the story: active (should be tested), generated (AI generated, needs approval), paused (dont test in CI), archived (dont test and hide from UI), planned (planned feature, dont test yet)';

-- Add comment to explain the metadata column
COMMENT ON COLUMN public.stories.metadata IS 'Additional JSON metadata for the story';

-- Drop the archived column
ALTER TABLE public.stories
DROP COLUMN IF EXISTS archived;

-- Down Migration

-- Re-add archived column
ALTER TABLE public.stories
ADD COLUMN archived boolean NOT NULL DEFAULT false;

-- Migrate state back to archived: archived = true if state = 'archived', else false
UPDATE public.stories
SET archived = (state = 'archived'::public.story_state);

-- Drop new index
DROP INDEX IF EXISTS public.stories_repo_id_state_idx;

-- Recreate old index
CREATE INDEX IF NOT EXISTS stories_repo_id_archived_idx ON public.stories(repo_id, archived) WHERE archived = false;

-- Drop metadata column
ALTER TABLE public.stories
DROP COLUMN IF EXISTS metadata;

-- Drop state column
ALTER TABLE public.stories
DROP COLUMN IF EXISTS state;

-- Drop enum type
DROP TYPE IF EXISTS public.story_state;
