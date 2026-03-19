CREATE TYPE "public"."transfer_session_status" AS ENUM('pending', 'scanning', 'paused', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TABLE "transfer_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"operation" text NOT NULL,
	"status" "transfer_session_status" DEFAULT 'pending' NOT NULL,
	"target_folder_id" text,
	"target_provider_id" text,
	"source_items" jsonb,
	"manifest" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transfer_sessions" ADD CONSTRAINT "transfer_sessions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_sessions" ADD CONSTRAINT "transfer_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_sessions" ADD CONSTRAINT "transfer_sessions_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_sessions" ADD CONSTRAINT "transfer_sessions_target_provider_id_storage_providers_id_fk" FOREIGN KEY ("target_provider_id") REFERENCES "public"."storage_providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "transfer_sessions_job_id_unique" ON "transfer_sessions" USING btree ("job_id");