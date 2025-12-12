CREATE TABLE "cli_auth_state" (
	"state_token" text PRIMARY KEY NOT NULL,
	"session_token" text,
	"user_id" text,
	"openrouter_api_key" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
