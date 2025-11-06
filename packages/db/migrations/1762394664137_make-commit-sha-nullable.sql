-- Up Migration

-- Make commit_sha nullable so we can create runs before fetching commit info from GitHub
ALTER TABLE public.runs ALTER COLUMN commit_sha DROP NOT NULL;

-- Down Migration

-- Restore NOT NULL constraint (will fail if there are any NULL values)
ALTER TABLE public.runs ALTER COLUMN commit_sha SET NOT NULL;

