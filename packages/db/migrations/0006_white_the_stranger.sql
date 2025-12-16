CREATE TABLE "xp_stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"instructions" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xp_stories_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"story_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"session_id" text,
	"session_recording_url" text,
	"observations" jsonb,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "xp_stories" ADD CONSTRAINT "xp_stories_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_stories_runs" ADD CONSTRAINT "xp_stories_runs_story_id_xp_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."xp_stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_stories_runs" ADD CONSTRAINT "xp_stories_runs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "xp_stories_user_id_idx" ON "xp_stories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "xp_stories_runs_story_id_idx" ON "xp_stories_runs" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "xp_stories_runs_user_id_idx" ON "xp_stories_runs" USING btree ("user_id");