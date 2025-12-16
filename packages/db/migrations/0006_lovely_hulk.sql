DROP TABLE "runs" CASCADE;--> statement-breakpoint
DROP TABLE "stories" CASCADE;--> statement-breakpoint
DROP TABLE "story_evidence_cache" CASCADE;--> statement-breakpoint
DROP TABLE "story_test_results" CASCADE;--> statement-breakpoint
ALTER TABLE "cli_auth_state" ADD COLUMN "redirect_uri" text;--> statement-breakpoint
DROP TYPE "public"."story_state";