CREATE TYPE "public"."provider_auth_kind" AS ENUM('oauth', 'api_key', 'credentials', 'none');--> statement-breakpoint
CREATE TYPE "public"."provider_status" AS ENUM('connected', 'error', 'disconnected');--> statement-breakpoint
CREATE TYPE "public"."node_type" AS ENUM('file', 'folder');--> statement-breakpoint
CREATE TYPE "public"."conflict_action" AS ENUM('overwrite', 'skip', 'rename');--> statement-breakpoint
CREATE TYPE "public"."conflict_strategy" AS ENUM('overwrite', 'skip', 'rename', 'error', 'ask');--> statement-breakpoint
CREATE TYPE "public"."job_kind" AS ENUM('create_folder', 'upload', 'download', 'transfer', 'copy', 'move', 'delete');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'running', 'succeeded', 'failed', 'cancelled', 'skipped', 'awaiting_conflict');--> statement-breakpoint
CREATE TYPE "public"."operation_kind" AS ENUM('upload', 'download', 'transfer', 'copy_tree', 'move_tree', 'delete_tree');--> statement-breakpoint
CREATE TYPE "public"."operation_status" AS ENUM('planning', 'awaiting_user', 'ready', 'running', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."upload_session_mode" AS ENUM('proxy', 'direct');--> statement-breakpoint
CREATE TYPE "public"."upload_session_status" AS ENUM('pending', 'uploading', 'ready', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
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
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
CREATE TABLE "oauth_apps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"label" text NOT NULL,
	"client_id" text NOT NULL,
	"client_secret" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"auth_kind" "provider_auth_kind" NOT NULL,
	"oauth_app_id" uuid,
	"label" text NOT NULL,
	"status" "provider_status" DEFAULT 'connected' NOT NULL,
	"credentials" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"remote_id" text NOT NULL,
	"name" text NOT NULL,
	"type" "node_type" NOT NULL,
	"parent_id" uuid,
	"path_text" text NOT NULL,
	"size" bigint,
	"mime_type" text,
	"checksum" text,
	"remote_created_at" timestamp with time zone,
	"remote_updated_at" timestamp with time zone,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"total" bigint,
	"used" bigint,
	"available" bigint,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" uuid NOT NULL,
	"parent_job_id" uuid,
	"kind" "job_kind" NOT NULL,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"payload" jsonb NOT NULL,
	"size_bytes" bigint,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"bytes_transferred" bigint DEFAULT 0 NOT NULL,
	"last_error" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operation_conflicts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"path" text NOT NULL,
	"existing_type" text NOT NULL,
	"incoming_type" text NOT NULL,
	"decision" "conflict_action",
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" "operation_kind" NOT NULL,
	"status" "operation_status" DEFAULT 'planning' NOT NULL,
	"strategy" "conflict_strategy" NOT NULL,
	"plan" jsonb,
	"summary" jsonb,
	"error" text,
	"blanket_conflict_decision" "conflict_action",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "upload_chunks" (
	"session_id" uuid NOT NULL,
	"index" integer NOT NULL,
	"size" integer NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "upload_chunks_session_id_index_pk" PRIMARY KEY("session_id","index")
);
--> statement-breakpoint
CREATE TABLE "upload_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"provider_id" uuid NOT NULL,
	"parent_remote_id" text,
	"name" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"mime_type" text,
	"mode" "upload_session_mode" NOT NULL,
	"chunk_size_bytes" integer NOT NULL,
	"total_chunks" integer NOT NULL,
	"status" "upload_session_status" DEFAULT 'pending' NOT NULL,
	"staging_dir" text,
	"multipart_upload_id" text,
	"multipart_key" text,
	"parts" jsonb,
	"plan_id" uuid,
	"dst_path" text NOT NULL,
	"last_error" text,
	"abandoned_after" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "transfer_stats" (
	"user_id" text PRIMARY KEY NOT NULL,
	"bytes_uploaded" bigint DEFAULT 0 NOT NULL,
	"bytes_downloaded" bigint DEFAULT 0 NOT NULL,
	"bytes_transferred" bigint DEFAULT 0 NOT NULL,
	"files_uploaded" integer DEFAULT 0 NOT NULL,
	"files_downloaded" integer DEFAULT 0 NOT NULL,
	"files_transferred" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_apps" ADD CONSTRAINT "oauth_apps_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "providers" ADD CONSTRAINT "providers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "providers" ADD CONSTRAINT "providers_oauth_app_id_oauth_apps_id_fk" FOREIGN KEY ("oauth_app_id") REFERENCES "public"."oauth_apps"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_parent_id_nodes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage" ADD CONSTRAINT "usage_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_parent_job_id_jobs_id_fk" FOREIGN KEY ("parent_job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_conflicts" ADD CONSTRAINT "operation_conflicts_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_conflicts" ADD CONSTRAINT "operation_conflicts_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations" ADD CONSTRAINT "operations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_chunks" ADD CONSTRAINT "upload_chunks_session_id_upload_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."upload_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_stats" ADD CONSTRAINT "transfer_stats_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_uq" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "oauth_apps_user_idx" ON "oauth_apps" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_apps_user_label_uq" ON "oauth_apps" USING btree ("user_id","label");--> statement-breakpoint
CREATE INDEX "providers_user_idx" ON "providers" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "providers_user_label_uq" ON "providers" USING btree ("user_id","label");--> statement-breakpoint
CREATE UNIQUE INDEX "nodes_provider_remote_uq" ON "nodes" USING btree ("provider_id","remote_id");--> statement-breakpoint
CREATE INDEX "nodes_provider_path_idx" ON "nodes" USING btree ("provider_id","path_text");--> statement-breakpoint
CREATE INDEX "nodes_provider_parent_idx" ON "nodes" USING btree ("provider_id","parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_provider_uq" ON "usage" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "jobs_operation_idx" ON "jobs" USING btree ("operation_id");--> statement-breakpoint
CREATE INDEX "jobs_status_idx" ON "jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "jobs_parent_idx" ON "jobs" USING btree ("parent_job_id");--> statement-breakpoint
CREATE INDEX "conflicts_operation_idx" ON "operation_conflicts" USING btree ("operation_id");--> statement-breakpoint
CREATE INDEX "conflicts_job_idx" ON "operation_conflicts" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "operations_user_idx" ON "operations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "operations_status_idx" ON "operations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "upload_sessions_user_idx" ON "upload_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "upload_sessions_status_idx" ON "upload_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "upload_sessions_abandoned_idx" ON "upload_sessions" USING btree ("abandoned_after");--> statement-breakpoint
CREATE INDEX "upload_sessions_plan_idx" ON "upload_sessions" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "upload_sessions_plan_path_idx" ON "upload_sessions" USING btree ("plan_id","dst_path");