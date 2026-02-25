CREATE TYPE "public"."activity_type" AS ENUM('upload', 'download', 'create', 'update', 'delete', 'move', 'copy', 'share', 'unshare');--> statement-breakpoint
CREATE TYPE "public"."analysis_model_tier" AS ENUM('lightweight', 'medium', 'heavy');--> statement-breakpoint
CREATE TYPE "public"."analysis_status" AS ENUM('pending', 'running', 'completed', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."analysis_task_type" AS ENUM('embedding', 'ocr', 'object_detection');--> statement-breakpoint
CREATE TYPE "public"."analysis_trigger" AS ENUM('upload', 'manual_reprocess', 'backfill', 'provider_sync');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending', 'running', 'completed', 'error');--> statement-breakpoint
CREATE TYPE "public"."node_type" AS ENUM('file', 'folder');--> statement-breakpoint
CREATE TYPE "public"."permission_role" AS ENUM('viewer', 'editor', 'admin', 'owner');--> statement-breakpoint
CREATE TYPE "public"."auth_type" AS ENUM('oauth', 'api_key', 'email_pass', 'no_auth');--> statement-breakpoint
CREATE TYPE "public"."provider_type" AS ENUM('google_drive', 's3', 'local', 'dropbox', 'ftp', 'webdav', 'telegram', 'nextcloud', 'darkibox');--> statement-breakpoint
CREATE TYPE "public"."upload_session_status" AS ENUM('pending', 'uploading', 'assembling', 'transferring', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('viewer', 'editor', 'admin', 'owner');--> statement-breakpoint
CREATE TYPE "public"."workspace_role" AS ENUM('owner', 'admin', 'editor', 'viewer');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "activity_type" NOT NULL,
	"user_id" text NOT NULL,
	"file_id" text,
	"folder_id" text,
	"provider_id" text,
	"workspace_id" text,
	"bytes" bigint DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_analysis_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"analysis_key" text NOT NULL,
	"trigger" "analysis_trigger" DEFAULT 'upload' NOT NULL,
	"status" "analysis_status" DEFAULT 'pending' NOT NULL,
	"embedding_status" "analysis_status" DEFAULT 'pending' NOT NULL,
	"ocr_status" "analysis_status" DEFAULT 'pending' NOT NULL,
	"object_detection_status" "analysis_status" DEFAULT 'pending' NOT NULL,
	"embedding_error" text,
	"ocr_error" text,
	"object_detection_error" text,
	"tier_embedding" "analysis_model_tier" DEFAULT 'medium' NOT NULL,
	"tier_ocr" "analysis_model_tier" DEFAULT 'medium' NOT NULL,
	"tier_object" "analysis_model_tier" DEFAULT 'medium' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_detected_objects" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"run_id" text NOT NULL,
	"label" text NOT NULL,
	"confidence" real NOT NULL,
	"bbox" jsonb,
	"count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_embeddings" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"run_id" text NOT NULL,
	"model_name" text NOT NULL,
	"model_tier" "analysis_model_tier" NOT NULL,
	"embedding" vector(512),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_extracted_text" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"run_id" text NOT NULL,
	"source" text NOT NULL,
	"language" text,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_text_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"run_id" text NOT NULL,
	"source" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"text" text NOT NULL,
	"model_name" text NOT NULL,
	"model_tier" "analysis_model_tier" NOT NULL,
	"embedding" vector(512) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_ai_progress" (
	"workspace_id" text PRIMARY KEY NOT NULL,
	"eligible_files" integer DEFAULT 0 NOT NULL,
	"processed_files" integer DEFAULT 0 NOT NULL,
	"pending_files" integer DEFAULT 0 NOT NULL,
	"running_files" integer DEFAULT 0 NOT NULL,
	"failed_files" integer DEFAULT 0 NOT NULL,
	"skipped_files" integer DEFAULT 0 NOT NULL,
	"completed_files" integer DEFAULT 0 NOT NULL,
	"completion_pct" real DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_ai_settings" (
	"workspace_id" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"models_ready" boolean DEFAULT false NOT NULL,
	"embedding_tier" "analysis_model_tier" DEFAULT 'medium' NOT NULL,
	"ocr_tier" "analysis_model_tier" DEFAULT 'medium' NOT NULL,
	"object_tier" "analysis_model_tier" DEFAULT 'medium' NOT NULL,
	"max_concurrency" integer DEFAULT 2 NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"priority" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"conditions" jsonb NOT NULL,
	"destination_provider_id" text NOT NULL,
	"destination_folder_id" text,
	"workspace_id" text NOT NULL,
	"created_by" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"node_type" "node_type" NOT NULL,
	"virtual_path" text NOT NULL,
	"name" text NOT NULL,
	"remote_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"workspace_id" text,
	"folder_id" text,
	"parent_id" text,
	"uploaded_by" text,
	"created_by" text,
	"vault_id" text,
	"mime_type" text DEFAULT '' NOT NULL,
	"size" bigint DEFAULT 0 NOT NULL,
	"hash" text,
	"is_encrypted" boolean DEFAULT false NOT NULL,
	"encrypted_file_key" text,
	"encrypted_chunk_size" integer,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"starred" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text,
	"progress" real DEFAULT 0 NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"folder_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "permission_role" NOT NULL,
	"granted_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_folder_id_user_id_unique" UNIQUE("folder_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "oauth_provider_credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "provider_type" NOT NULL,
	"encrypted_config" text NOT NULL,
	"identifier_label" text NOT NULL,
	"identifier_value" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storage_providers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "provider_type" NOT NULL,
	"auth_type" "auth_type" DEFAULT 'no_auth' NOT NULL,
	"encrypted_config" text NOT NULL,
	"workspace_id" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"account_email" text,
	"account_name" text,
	"root_folder_id" text,
	"quota_total" bigint,
	"quota_used" bigint DEFAULT 0 NOT NULL,
	"last_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"size" bigint NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "upload_chunks_session_chunk_idx" UNIQUE("session_id","chunk_index")
);
--> statement-breakpoint
CREATE TABLE "upload_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"total_size" bigint NOT NULL,
	"chunk_size" integer DEFAULT 52428800 NOT NULL,
	"total_chunks" integer NOT NULL,
	"received_chunks" integer DEFAULT 0 NOT NULL,
	"status" "upload_session_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"provider_id" text NOT NULL,
	"folder_id" text,
	"file_id" text,
	"user_id" text NOT NULL,
	"bullmq_job_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vaults" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"public_key" text NOT NULL,
	"encrypted_private_key" text NOT NULL,
	"kek_salt" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vaults_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "workspace_invites" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"token" text NOT NULL,
	"role" "workspace_role" DEFAULT 'viewer' NOT NULL,
	"invited_by" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_by" text,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "workspace_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "workspace_role" DEFAULT 'viewer' NOT NULL,
	"invited_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_memberships_workspace_id_user_id_unique" UNIQUE("workspace_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "workspace_stats" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"bucket_start" timestamp with time zone NOT NULL,
	"uploaded_bytes" bigint DEFAULT 0 NOT NULL,
	"downloaded_bytes" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT 'sky' NOT NULL,
	"owner_id" text NOT NULL,
	"sync_operations_to_provider" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_file_id_nodes_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_folder_id_nodes_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_provider_id_storage_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."storage_providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_analysis_runs" ADD CONSTRAINT "file_analysis_runs_file_id_nodes_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_analysis_runs" ADD CONSTRAINT "file_analysis_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_detected_objects" ADD CONSTRAINT "file_detected_objects_file_id_nodes_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_detected_objects" ADD CONSTRAINT "file_detected_objects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_detected_objects" ADD CONSTRAINT "file_detected_objects_run_id_file_analysis_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."file_analysis_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_embeddings" ADD CONSTRAINT "file_embeddings_file_id_nodes_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_embeddings" ADD CONSTRAINT "file_embeddings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_embeddings" ADD CONSTRAINT "file_embeddings_run_id_file_analysis_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."file_analysis_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_extracted_text" ADD CONSTRAINT "file_extracted_text_file_id_nodes_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_extracted_text" ADD CONSTRAINT "file_extracted_text_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_extracted_text" ADD CONSTRAINT "file_extracted_text_run_id_file_analysis_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."file_analysis_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_text_chunks" ADD CONSTRAINT "file_text_chunks_file_id_nodes_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_text_chunks" ADD CONSTRAINT "file_text_chunks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_text_chunks" ADD CONSTRAINT "file_text_chunks_run_id_file_analysis_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."file_analysis_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_ai_progress" ADD CONSTRAINT "workspace_ai_progress_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_ai_settings" ADD CONSTRAINT "workspace_ai_settings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_rules" ADD CONSTRAINT "file_rules_destination_provider_id_storage_providers_id_fk" FOREIGN KEY ("destination_provider_id") REFERENCES "public"."storage_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_rules" ADD CONSTRAINT "file_rules_destination_folder_id_nodes_id_fk" FOREIGN KEY ("destination_folder_id") REFERENCES "public"."nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_rules" ADD CONSTRAINT "file_rules_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_rules" ADD CONSTRAINT "file_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_provider_id_storage_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."storage_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_vault_id_vaults_id_fk" FOREIGN KEY ("vault_id") REFERENCES "public"."vaults"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_folder_id_nodes_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_provider_credentials" ADD CONSTRAINT "oauth_provider_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_providers" ADD CONSTRAINT "storage_providers_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_chunks" ADD CONSTRAINT "upload_chunks_session_id_upload_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."upload_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_provider_id_storage_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."storage_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_folder_id_nodes_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_file_id_nodes_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaults" ADD CONSTRAINT "vaults_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_accepted_by_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_stats" ADD CONSTRAINT "workspace_stats_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_workspace_created_idx" ON "activities" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "activities_workspace_type_created_idx" ON "activities" USING btree ("workspace_id","type","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "file_analysis_runs_analysis_key_idx" ON "file_analysis_runs" USING btree ("analysis_key");--> statement-breakpoint
CREATE UNIQUE INDEX "file_embeddings_file_model_run_idx" ON "file_embeddings" USING btree ("file_id","model_name","run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "file_text_chunks_file_run_chunk_idx" ON "file_text_chunks" USING btree ("file_id","run_id","chunk_index");--> statement-breakpoint
CREATE INDEX "file_text_chunks_workspace_idx" ON "file_text_chunks" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "file_text_chunks_file_idx" ON "file_text_chunks" USING btree ("file_id");--> statement-breakpoint
CREATE UNIQUE INDEX "nodes_virtual_path_provider_id_unique" ON "nodes" USING btree ("virtual_path","provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "nodes_remote_id_provider_id_unique" ON "nodes" USING btree ("remote_id","provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_provider_credentials_user_type_identifier_idx" ON "oauth_provider_credentials" USING btree ("user_id","type","identifier_value");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_stats_workspace_bucket_unique" ON "workspace_stats" USING btree ("workspace_id","bucket_start");