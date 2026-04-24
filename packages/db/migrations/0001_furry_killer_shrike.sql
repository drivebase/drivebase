CREATE TYPE "public"."upload_session_mode" AS ENUM('proxy', 'direct');--> statement-breakpoint
CREATE TYPE "public"."upload_session_status" AS ENUM('pending', 'uploading', 'ready', 'completed', 'failed', 'cancelled');--> statement-breakpoint
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
	"last_error" text,
	"abandoned_after" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "upload_chunks" ADD CONSTRAINT "upload_chunks_session_id_upload_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."upload_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "upload_sessions_user_idx" ON "upload_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "upload_sessions_status_idx" ON "upload_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "upload_sessions_abandoned_idx" ON "upload_sessions" USING btree ("abandoned_after");--> statement-breakpoint
CREATE UNIQUE INDEX "upload_sessions_plan_uq" ON "upload_sessions" USING btree ("plan_id");