-- Up Migration

-- Runs table to store test run execution information
CREATE TABLE public.runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    repo_id uuid NOT NULL REFERENCES public.repos(id) ON DELETE CASCADE,
    commit_sha text NOT NULL,
    branch_name text NOT NULL,
    commit_message text,
    pr_number text,
    status text NOT NULL CHECK (status IN ('pass', 'fail', 'skipped')),
    summary text,
    stories jsonb NOT NULL DEFAULT '[]'::jsonb
);

COMMENT ON COLUMN public.runs.id IS 'Unique identifier for each run';
COMMENT ON COLUMN public.runs.created_at IS 'The time when the run was created';
COMMENT ON COLUMN public.runs.updated_at IS 'The time when the run was last updated';
COMMENT ON COLUMN public.runs.repo_id IS 'FK to repos.id of the repository this run belongs to';
COMMENT ON COLUMN public.runs.commit_sha IS 'The SHA of the commit that was tested';
COMMENT ON COLUMN public.runs.branch_name IS 'The branch name this run was executed on';
COMMENT ON COLUMN public.runs.commit_message IS 'The commit message';
COMMENT ON COLUMN public.runs.pr_number IS 'The pull request number associated with this run';
COMMENT ON COLUMN public.runs.status IS 'The overall status of the run (pass, fail, skipped)';
COMMENT ON COLUMN public.runs.summary IS 'Summary of the run execution';
COMMENT ON COLUMN public.runs.stories IS 'Array of story execution details with storyId and status';

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS runs_repo_id_idx ON public.runs(repo_id);
CREATE INDEX IF NOT EXISTS runs_commit_sha_idx ON public.runs(commit_sha);
CREATE INDEX IF NOT EXISTS runs_branch_name_idx ON public.runs(branch_name);
CREATE INDEX IF NOT EXISTS runs_repo_commit_idx ON public.runs(repo_id, commit_sha);
CREATE INDEX IF NOT EXISTS runs_status_idx ON public.runs(status);

-- Add trigger to automatically update updated_at timestamp
CREATE TRIGGER set_timestamp_runs
BEFORE UPDATE ON public.runs
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Down Migration

-- Drop trigger
DROP TRIGGER IF EXISTS set_timestamp_runs ON public.runs;

-- Drop indexes
DROP INDEX IF EXISTS public.runs_status_idx;
DROP INDEX IF EXISTS public.runs_repo_commit_idx;
DROP INDEX IF EXISTS public.runs_branch_name_idx;
DROP INDEX IF EXISTS public.runs_commit_sha_idx;
DROP INDEX IF EXISTS public.runs_repo_id_idx;

-- Drop table
DROP TABLE IF EXISTS public.runs;

