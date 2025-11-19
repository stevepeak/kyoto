-- Up Migration
-- Add onboarding_metadata column to user table

ALTER TABLE public."user"
ADD COLUMN onboarding_metadata jsonb;

COMMENT ON COLUMN public."user".onboarding_metadata IS 'Onboarding questionnaire answers stored as JSON';

-- Down Migration
-- Remove onboarding_metadata column

ALTER TABLE public."user"
DROP COLUMN IF EXISTS onboarding_metadata;
