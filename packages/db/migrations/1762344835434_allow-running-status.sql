-- Up Migration

-- Drop the existing CHECK constraint on status
ALTER TABLE public.runs DROP CONSTRAINT IF EXISTS runs_status_check;

-- Add new CHECK constraint that includes 'running' status
ALTER TABLE public.runs ADD CONSTRAINT runs_status_check CHECK (status IN ('pass', 'fail', 'skipped', 'running'));

-- Update comment to reflect new status values
COMMENT ON COLUMN public.runs.status IS 'The overall status of the run (pass, fail, skipped, running)';

-- Down Migration

-- Drop the new CHECK constraint
ALTER TABLE public.runs DROP CONSTRAINT IF EXISTS runs_status_check;

-- Restore the original CHECK constraint
ALTER TABLE public.runs ADD CONSTRAINT runs_status_check CHECK (status IN ('pass', 'fail', 'skipped'));

-- Restore original comment
COMMENT ON COLUMN public.runs.status IS 'The overall status of the run (pass, fail, skipped)';

