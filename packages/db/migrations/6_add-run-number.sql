-- Up Migration

-- Add number column to runs table for per-repo auto-incrementing numbers
ALTER TABLE public.runs ADD COLUMN number integer;

-- Create function to get next run number for a repo
-- This function safely handles concurrent inserts using advisory locks
CREATE OR REPLACE FUNCTION public.get_next_run_number(p_repo_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_number integer;
  v_lock_id bigint;
BEGIN
  -- Use repo_id hash as advisory lock ID to serialize per-repo
  -- hashtext returns int4, so we convert to bigint for advisory lock
  v_lock_id := abs(hashtext(p_repo_id::text))::bigint;
  
  -- Acquire advisory lock for this repo (blocks until available)
  PERFORM pg_advisory_xact_lock(v_lock_id);
  
  -- Get next number (now safely serialized for this repo)
  SELECT COALESCE(MAX(number), 0) + 1
  INTO v_next_number
  FROM public.runs
  WHERE repo_id = p_repo_id;
  
  RETURN v_next_number;
END;
$$;

-- Update existing runs to have numbers (backfill)
-- Assign numbers based on creation order per repo
DO $$
DECLARE
  r RECORD;
  v_number integer;
BEGIN
  FOR r IN
    SELECT id, repo_id
    FROM public.runs
    ORDER BY repo_id, created_at, id
  LOOP
    -- Get the current max number for this repo
    SELECT COALESCE(MAX(number), 0) + 1
    INTO v_number
    FROM public.runs
    WHERE repo_id = r.repo_id AND number IS NOT NULL;
    
    -- If no runs have numbers yet, start at 1
    IF v_number IS NULL THEN
      v_number := 1;
    END IF;
    
    -- Set the number for this run
    UPDATE public.runs
    SET number = v_number
    WHERE id = r.id;
  END LOOP;
END $$;

-- Make number column NOT NULL after backfilling
ALTER TABLE public.runs ALTER COLUMN number SET NOT NULL;

-- Create unique constraint on (repo_id, number) to ensure uniqueness per repo
CREATE UNIQUE INDEX runs_repo_id_number_unique_idx ON public.runs(repo_id, number);

-- Create trigger to automatically set number on insert
CREATE OR REPLACE FUNCTION public.set_run_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only set number if it's not already provided
  IF NEW.number IS NULL THEN
    NEW.number := public.get_next_run_number(NEW.repo_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_run_number_trigger
BEFORE INSERT ON public.runs
FOR EACH ROW
EXECUTE FUNCTION public.set_run_number();

-- Add index on number for efficient lookups
CREATE INDEX IF NOT EXISTS runs_repo_id_number_idx ON public.runs(repo_id, number);

-- Down Migration

-- Drop trigger
DROP TRIGGER IF EXISTS set_run_number_trigger ON public.runs;

-- Drop function
DROP FUNCTION IF EXISTS public.set_run_number();

-- Drop function
DROP FUNCTION IF EXISTS public.get_next_run_number(uuid);

-- Drop indexes
DROP INDEX IF EXISTS public.runs_repo_id_number_idx;
DROP INDEX IF EXISTS public.runs_repo_id_number_unique_idx;

-- Drop column
ALTER TABLE public.runs DROP COLUMN IF EXISTS number;
