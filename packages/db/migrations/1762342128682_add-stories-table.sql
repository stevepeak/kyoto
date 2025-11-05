-- Up Migration

-- Stories table to store Gherkin-style stories generated from repository analysis
CREATE TABLE public.stories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    repo_id uuid NOT NULL REFERENCES public.repos(id) ON DELETE CASCADE,
    branch_name text NOT NULL,
    commit_sha text,
    name text NOT NULL,
    story text NOT NULL,
    files jsonb NOT NULL DEFAULT '[]'::jsonb
);

COMMENT ON COLUMN public.stories.id IS 'Unique identifier for each story';
COMMENT ON COLUMN public.stories.created_at IS 'The time when the story was created';
COMMENT ON COLUMN public.stories.updated_at IS 'The time when the story was last updated';
COMMENT ON COLUMN public.stories.repo_id IS 'FK to repos.id of the repository this story belongs to';
COMMENT ON COLUMN public.stories.branch_name IS 'The branch name this story was generated from (e.g., "main", "master")';
COMMENT ON COLUMN public.stories.commit_sha IS 'The SHA of the commit that was analyzed';
COMMENT ON COLUMN public.stories.name IS 'The title/name of the story';
COMMENT ON COLUMN public.stories.story IS 'The Gherkin story text';
COMMENT ON COLUMN public.stories.files IS 'Array of file references in format ["path@startLine:endLine", ...]';

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS stories_repo_id_idx ON public.stories(repo_id);
CREATE INDEX IF NOT EXISTS stories_branch_name_idx ON public.stories(branch_name);
CREATE INDEX IF NOT EXISTS stories_repo_branch_idx ON public.stories(repo_id, branch_name);

-- Add trigger to automatically update updated_at timestamp
CREATE TRIGGER set_timestamp_stories
BEFORE UPDATE ON public.stories
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Down Migration

-- Drop trigger
DROP TRIGGER IF EXISTS set_timestamp_stories ON public.stories;

-- Drop indexes
DROP INDEX IF EXISTS public.stories_repo_branch_idx;
DROP INDEX IF EXISTS public.stories_branch_name_idx;
DROP INDEX IF EXISTS public.stories_repo_id_idx;

-- Drop table
DROP TABLE IF EXISTS public.stories;

