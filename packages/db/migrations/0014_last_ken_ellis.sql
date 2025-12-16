ALTER TABLE "xp_integrations" RENAME TO "integrations";--> statement-breakpoint
ALTER TABLE "xp_stories" RENAME TO "stories";--> statement-breakpoint
ALTER TABLE "xp_stories_runs" RENAME TO "story_runs";--> statement-breakpoint
ALTER TABLE "integrations" DROP CONSTRAINT "xp_integrations_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "stories" DROP CONSTRAINT "xp_stories_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "story_runs" DROP CONSTRAINT "xp_stories_runs_story_id_xp_stories_id_fk";
--> statement-breakpoint
ALTER TABLE "story_runs" DROP CONSTRAINT "xp_stories_runs_user_id_user_id_fk";
--> statement-breakpoint
DROP INDEX "xp_integrations_user_id_idx";--> statement-breakpoint
DROP INDEX "xp_stories_user_id_idx";--> statement-breakpoint
DROP INDEX "xp_stories_runs_story_id_idx";--> statement-breakpoint
DROP INDEX "xp_stories_runs_user_id_idx";--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_runs" ADD CONSTRAINT "story_runs_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_runs" ADD CONSTRAINT "story_runs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "integrations_user_id_idx" ON "integrations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "stories_user_id_idx" ON "stories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "story_runs_story_id_idx" ON "story_runs" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "story_runs_user_id_idx" ON "story_runs" USING btree ("user_id");