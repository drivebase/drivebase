CREATE TYPE "public"."file_lifecycle_state" AS ENUM('hot', 'archived', 'restore_requested', 'restoring', 'restored_temporary', 'unknown');--> statement-breakpoint
ALTER TABLE "nodes" ADD COLUMN "lifecycle_state" "file_lifecycle_state" DEFAULT 'hot' NOT NULL;--> statement-breakpoint
ALTER TABLE "nodes" ADD COLUMN "storage_class" text;--> statement-breakpoint
ALTER TABLE "nodes" ADD COLUMN "restore_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "nodes" ADD COLUMN "restore_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "nodes" ADD COLUMN "lifecycle_checked_at" timestamp with time zone;