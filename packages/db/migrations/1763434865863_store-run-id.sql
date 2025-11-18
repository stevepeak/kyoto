-- Up Migration

-- Add trigger.dev run tracking field to runs table (JSON: {runId})
ALTER TABLE public.runs
ADD COLUMN ext_trigger_dev jsonb;

-- Add comment
COMMENT ON COLUMN public.runs.ext_trigger_dev IS 'Trigger.dev run tracking data: {runId: string}';

-- Add trigger.dev run tracking field to story_test_results table (JSON: {runId})
ALTER TABLE public.story_test_results
ADD COLUMN ext_trigger_dev jsonb;

-- Add comment
COMMENT ON COLUMN public.story_test_results.ext_trigger_dev IS 'Trigger.dev run tracking data: {runId: string}';

-- Down Migration

-- Remove trigger.dev run tracking field from story_test_results
ALTER TABLE public.story_test_results
DROP COLUMN IF EXISTS ext_trigger_dev;

-- Remove trigger.dev run tracking field from runs
ALTER TABLE public.runs
DROP COLUMN IF EXISTS ext_trigger_dev;

