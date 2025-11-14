-- Up Migration

-- Add archived column to stories table
ALTER TABLE public.stories
ADD COLUMN archived boolean NOT NULL DEFAULT false;

-- Add comment to explain the column
COMMENT ON COLUMN public.stories.archived IS 'Whether the story has been archived (soft delete)';

-- Create index for efficient filtering of non-archived stories
CREATE INDEX IF NOT EXISTS stories_repo_id_archived_idx ON public.stories(repo_id, archived) WHERE archived = false;

-- Down Migration

-- Drop index
DROP INDEX IF EXISTS public.stories_repo_id_archived_idx;

-- Drop column
ALTER TABLE public.stories DROP COLUMN IF EXISTS archived;

