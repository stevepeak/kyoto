CREATE TYPE "public"."story_test_type" AS ENUM('browser', 'vm');--> statement-breakpoint
ALTER TABLE "xp_stories" ADD COLUMN "test_type" "story_test_type" DEFAULT 'browser' NOT NULL;