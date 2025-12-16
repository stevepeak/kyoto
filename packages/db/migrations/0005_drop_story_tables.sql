-- Drop tables in order of foreign key dependencies
DROP TABLE IF EXISTS "story_evidence_cache";
DROP TABLE IF EXISTS "story_test_results";
DROP TABLE IF EXISTS "stories";
DROP TABLE IF EXISTS "runs";

-- Drop the story_state enum
DROP TYPE IF EXISTS "story_state";

