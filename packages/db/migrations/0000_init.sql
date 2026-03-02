CREATE TYPE "public"."job_status" AS ENUM('pending', 'running', 'completed', 'error');--> statement-breakpoint
CREATE TYPE "public"."file_lifecycle_state" AS ENUM('hot', 'archived', 'restore_requested', 'restoring', 'restored_temporary', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."node_type" AS ENUM('file', 'folder');--> statement-breakpoint
CREATE TYPE "public"."permission_role" AS ENUM('viewer', 'editor', 'admin', 'owner');--> statement-breakpoint
CREATE TYPE "public"."auth_type" AS ENUM('oauth', 'api_key', 'email_pass', 'no_auth');--> statement-breakpoint
CREATE TYPE "public"."provider_type" AS ENUM('google_drive', 's3', 'local', 'dropbox', 'ftp', 'webdav', 'telegram', 'nextcloud', 'darkibox');--> statement-breakpoint
CREATE TYPE "public"."upload_session_status" AS ENUM('pending', 'uploading', 'assembling', 'transferring', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('viewer', 'editor', 'admin', 'owner');--> statement-breakpoint
CREATE TYPE "public"."workspace_role" AS ENUM('owner', 'admin', 'editor', 'viewer');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"status" text,
	"user_id" text NOT NULL,
	"workspace_id" text,
	"details" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"scopes" text[] NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "file_download_links" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"file_id" text NOT NULL,
	"created_by" text NOT NULL,
	"token" text NOT NULL,
	"max_downloads" integer DEFAULT 1 NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_accessed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "file_download_links_token_unique" UNIQUE("token")
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
	"lifecycle_state" "file_lifecycle_state" DEFAULT 'hot' NOT NULL,
	"storage_class" text,
	"restore_requested_at" timestamp with time zone,
	"restore_expires_at" timestamp with time zone,
	"lifecycle_checked_at" timestamp with time zone,
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
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passkeys" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text DEFAULT 'Passkey' NOT NULL,
	"credential_id" text NOT NULL,
	"public_key" text NOT NULL,
	"counter" integer DEFAULT 0 NOT NULL,
	"device_type" text NOT NULL,
	"backed_up" boolean DEFAULT false NOT NULL,
	"transports" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "passkeys_credential_id_unique" UNIQUE("credential_id")
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
ALTER TABLE "activities" ADD CONSTRAINT "activities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_download_links" ADD CONSTRAINT "file_download_links_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_download_links" ADD CONSTRAINT "file_download_links_file_id_nodes_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_download_links" ADD CONSTRAINT "file_download_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "passkeys" ADD CONSTRAINT "passkeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
CREATE INDEX "activities_workspace_type_created_idx" ON "activities" USING btree ("workspace_id","kind","occurred_at");--> statement-breakpoint
CREATE INDEX "api_keys_user_id_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "file_download_links_file_id_idx" ON "file_download_links" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "file_download_links_workspace_id_idx" ON "file_download_links" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "nodes_virtual_path_provider_id_unique" ON "nodes" USING btree ("virtual_path","provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "nodes_remote_id_provider_id_unique" ON "nodes" USING btree ("remote_id","provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_provider_credentials_user_type_identifier_idx" ON "oauth_provider_credentials" USING btree ("user_id","type","identifier_value");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_stats_workspace_bucket_unique" ON "workspace_stats" USING btree ("workspace_id","bucket_start");