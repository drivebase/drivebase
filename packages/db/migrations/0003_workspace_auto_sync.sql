CREATE TYPE "public"."workspace_auto_sync_scope" AS ENUM('all', 'selected');--> statement-breakpoint
CREATE TABLE "workspace_auto_sync_providers" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "auto_sync_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "auto_sync_cron" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "auto_sync_scope" "workspace_auto_sync_scope" DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_auto_sync_providers" ADD CONSTRAINT "workspace_auto_sync_providers_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_auto_sync_providers" ADD CONSTRAINT "workspace_auto_sync_providers_provider_id_storage_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."storage_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_auto_sync_providers_workspace_provider_uidx" ON "workspace_auto_sync_providers" USING btree ("workspace_id","provider_id");