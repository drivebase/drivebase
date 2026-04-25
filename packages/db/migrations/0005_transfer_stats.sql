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
ALTER TABLE "transfer_stats" ADD CONSTRAINT "transfer_stats_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;