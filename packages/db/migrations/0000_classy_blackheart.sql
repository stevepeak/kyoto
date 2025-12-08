CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

CREATE TYPE "public"."story_state" AS ENUM('active', 'generated', 'paused', 'archived', 'planned', 'processing');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'disabled', 'invited');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credential" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text,
	"email" text,
	"label" text,
	"tokens" jsonb NOT NULL,
	"primary" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "owner_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"owner_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	CONSTRAINT "owner_memberships_owner_user_unique" UNIQUE("owner_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "owners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"external_id" bigint,
	"login" text NOT NULL,
	"name" text,
	"type" text,
	"avatar_url" text,
	"html_url" text,
	"installation_id" bigint,
	CONSTRAINT "owners_external_id_unique" UNIQUE("external_id"),
	CONSTRAINT "owners_login_unique" UNIQUE("login")
);
--> statement-breakpoint
CREATE TABLE "repo_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"repo_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	CONSTRAINT "repo_memberships_repo_user_unique" UNIQUE("repo_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "repos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"external_id" bigint,
	"name" text NOT NULL,
	"full_name" text,
	"private" boolean DEFAULT false NOT NULL,
	"description" text,
	"default_branch" text,
	"html_url" text,
	"enabled" boolean DEFAULT false NOT NULL,
	CONSTRAINT "repos_external_id_unique" UNIQUE("external_id"),
	CONSTRAINT "repos_owner_name_unique" UNIQUE("owner_id","name")
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"repo_id" uuid NOT NULL,
	"commit_sha" text,
	"branch_name" text NOT NULL,
	"commit_message" text,
	"pr_number" text,
	"status" text NOT NULL,
	"summary" text,
	"stories" jsonb DEFAULT '[]' NOT NULL,
	"number" integer NOT NULL,
	"git_author" jsonb,
	"ext_trigger_dev" jsonb,
	CONSTRAINT "runs_repo_id_number_unique_idx" UNIQUE("repo_id","number")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"repo_id" uuid NOT NULL,
	"name" text NOT NULL,
	"story" text NOT NULL,
	"decomposition" jsonb,
	"state" "story_state" DEFAULT 'active' NOT NULL,
	"metadata" jsonb,
	"embedding" vector(1536)
);
--> statement-breakpoint
CREATE TABLE "story_evidence_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"branch_name" text NOT NULL,
	"story_id" uuid NOT NULL,
	"commit_sha" text NOT NULL,
	"cache_data" jsonb NOT NULL,
	"run_id" uuid,
	CONSTRAINT "story_evidence_cache_story_commit_unique_idx" UNIQUE("story_id","commit_sha")
);
--> statement-breakpoint
CREATE TABLE "story_test_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"story_id" uuid NOT NULL,
	"run_id" uuid,
	"status" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"duration_ms" integer,
	"analysis" jsonb,
	"analysis_version" integer NOT NULL,
	"ext_trigger_dev" jsonb
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"name" text,
	"email" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"last_interaction_at" timestamp with time zone,
	"time_zone" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential" ADD CONSTRAINT "credential_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_memberships" ADD CONSTRAINT "owner_memberships_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_memberships" ADD CONSTRAINT "owner_memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repo_memberships" ADD CONSTRAINT "repo_memberships_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repo_memberships" ADD CONSTRAINT "repo_memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repos" ADD CONSTRAINT "repos_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_evidence_cache" ADD CONSTRAINT "story_evidence_cache_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_evidence_cache" ADD CONSTRAINT "story_evidence_cache_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_test_results" ADD CONSTRAINT "story_test_results_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_test_results" ADD CONSTRAINT "story_test_results_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "owner_memberships_user_id_idx" ON "owner_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "owners_installation_id_unique" ON "owners" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "repo_memberships_repo_id_idx" ON "repo_memberships" USING btree ("repo_id");--> statement-breakpoint
CREATE INDEX "repo_memberships_user_id_idx" ON "repo_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "runs_repo_id_idx" ON "runs" USING btree ("repo_id");--> statement-breakpoint
CREATE INDEX "runs_branch_name_idx" ON "runs" USING btree ("branch_name");--> statement-breakpoint
CREATE INDEX "runs_commit_sha_idx" ON "runs" USING btree ("commit_sha");--> statement-breakpoint
CREATE INDEX "runs_status_idx" ON "runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "runs_repo_commit_idx" ON "runs" USING btree ("repo_id","commit_sha");--> statement-breakpoint
CREATE INDEX "runs_repo_id_number_idx" ON "runs" USING btree ("repo_id","number");--> statement-breakpoint
CREATE INDEX "stories_repo_id_idx" ON "stories" USING btree ("repo_id");--> statement-breakpoint
CREATE INDEX "stories_repo_id_state_idx" ON "stories" USING btree ("repo_id","state");--> statement-breakpoint
CREATE INDEX "story_evidence_cache_story_id_idx" ON "story_evidence_cache" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "story_evidence_cache_branch_name_idx" ON "story_evidence_cache" USING btree ("branch_name");--> statement-breakpoint
CREATE INDEX "story_evidence_cache_commit_sha_idx" ON "story_evidence_cache" USING btree ("commit_sha");--> statement-breakpoint
CREATE INDEX "story_evidence_cache_run_id_idx" ON "story_evidence_cache" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "story_test_results_story_id_idx" ON "story_test_results" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "story_test_results_run_id_idx" ON "story_test_results" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "story_test_results_status_idx" ON "story_test_results" USING btree ("status");