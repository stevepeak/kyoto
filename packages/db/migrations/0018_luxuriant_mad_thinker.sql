CREATE TABLE "security_audit_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"audit_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"results" jsonb,
	"score" text,
	"critical_issues" jsonb,
	"recommendations" jsonb,
	"session_id" text,
	"session_recording_url" text,
	"error" text,
	"trigger_run_id" text
);
--> statement-breakpoint
CREATE TABLE "security_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"repo_id" uuid NOT NULL,
	"name" text NOT NULL,
	"target_url" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"schedule_text" text,
	"cron_schedule" text,
	"trigger_schedule_id" text
);
--> statement-breakpoint
ALTER TABLE "security_audit_runs" ADD CONSTRAINT "security_audit_runs_audit_id_security_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."security_audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_audits" ADD CONSTRAINT "security_audits_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_audits" ADD CONSTRAINT "security_audits_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "security_audit_runs_audit_id_idx" ON "security_audit_runs" USING btree ("audit_id");--> statement-breakpoint
CREATE INDEX "security_audits_user_id_idx" ON "security_audits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "security_audits_repo_id_idx" ON "security_audits" USING btree ("repo_id");