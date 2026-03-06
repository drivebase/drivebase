CREATE TABLE "webdav_credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"provider_scopes" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "webdav_credentials" ADD CONSTRAINT "webdav_credentials_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webdav_credentials" ADD CONSTRAINT "webdav_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "webdav_credentials_workspace_id_idx" ON "webdav_credentials" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "webdav_credentials_user_id_idx" ON "webdav_credentials" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webdav_credentials_username_unique" ON "webdav_credentials" USING btree ("username");
